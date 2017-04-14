'use strict'
var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

class RedditAPI {
    constructor(conn) {
        this.conn = conn;
    }


    createUser(user) {
        /*
        first we have to hash the password. we will learn about hashing next week.
        the goal of hashing is to store a digested version of the password from which
        it is infeasible to recover the original password, but which can still be used
        to assess with great confidence whether a provided password is the correct one or not
         */
        return bcrypt.hash(user.password, HASH_ROUNDS)
            .then(hashedPassword => {
                return this.conn.query('INSERT INTO users (username,password, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [user.username, hashedPassword]);
            })
            .then(result => {
                return result.insertId;
            })
            .catch(error => {
                // Special error handling for duplicate entry
                if (error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A user with this username already exists');
                }
                else {
                    throw error;
                }
            });
    }

    createSubreddit(subreddit) {
        return this.conn.query(
            `
            INSERT INTO subreddits (name, description, createdAt, updatedAt)
            VALUES (?, ?, NOW(), NOW())`, [subreddit.name, subreddit.description]
            ) 
            .then(result => {
                return result.insertId;
            })
            .catch(error => {
                
                if(error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A subreddit with this name already exists! Try another topic :)')
                } 
                else {
                    throw error;
                }
            });
    }
    
    
    createPost(post) {
        return this.conn.query(
            `INSERT INTO posts (userId, title, url, createdAt, updatedAt, subredditId) VALUES (?, ?, ?, NOW(), NOW(), ?)`,
            [post.userId, post.title, post.url, post.subredditId])
            .then(result => {
                //console.log(result.subredditId);
                return result.subredditId;
            })
            .catch(error => {
                // Special error handling for no subreddit ID
                if (error.code === 'ER_NO_SRID') {
                    throw new Error('This Subreddit does not exist');
                }
                else {
                    throw error;
                }
                });
    }
    
    
    createVote(vote) {
            if(vote.voteDirection === 1 || vote.voteDirection === 0 || vote.voteDirection === -1) {
                return this.conn.query(
                    `
                    INSERT INTO votes SET postId = ?, userId = ?, voteDirection = ? 
                    ON DUPLICATE KEY UPDATE voteDirection = ?
                    `
                    [vote.postId, vote.userId, vote.voteDirection, vote.voteDirection])
                    .catch(console.log);
            } 
            else {
                throw new Error('Bad Vote');
            }
        }
    
    getAllPosts() {
        /*
        strings delimited with ` are an ES2015 feature called "template strings".
        they are more powerful than what we are using them for here. one feature of
        template strings is that you can write them on multiple lines. if you try to
        skip a line in a single- or double-quoted string, you would get a syntax error.

        therefore template strings make it very easy to write SQL queries that span multiple
        lines without having to manually split the string line by line.
         */
        return this.conn.query(
            `
            SELECT 
                SUM(votes.voteDirection) AS votes_Score, 
                posts.id AS posts_id, 
                posts.title As posts_title, 
                posts.url AS posts_url, 
                posts.userId AS posts_userID, 
                posts.createdAt AS posts_createdAt, 
                posts.updatedAt AS posts_updatedAt,
                users.id AS users_id,
                users.username AS users_username,
                users.createdAt AS users_createdAt, 
                users.updatedAt AS users_updatedAt,
                subreddits.id AS subreddits_id,
                subreddits.name AS subreddits_name,
                subreddits.description AS subreddits_description,
                subreddits.url AS subreddits_url,
                subreddits.createdAt AS subreddits_createdAt,
                subreddits.updatedAt AS subreddits_updatedAt
            FROM posts 
            JOIN users ON users.id = posts.userId
            JOIN subreddits ON posts.subredditId = subreddits.id
            LEFT JOIN votes ON posts.id = votes.postId
            GROUP BY votes.postId
            ORDER BY votes_Score
            LIMIT 25`
            
            
        ).then (function(result) {
            return result.map(function(val) {
                console.log(val);
                    return {
                        
                        votes_Score: val.votes_Score,
                        posts_id: val.posts_id,
                        posts_title: val.posts_title,
                        posts_url: val.posts_url,
                        posts_createdAt: val.posts_createdAt,
                        posts_updatedAt: val.posts_updatedAt,
                        
                        user:{
                            users_id: val.users_id,
                            users_username: val.users_username,
                            users_createdAt: val.users_createdAt,
                            users_updatedAt: val.users_updatedAt
                        },
                        
                        subreddits:{
                            subreddits_id: val.subreddits_id,
                            subreddits_name: val.subreddits_name,
                            subreddits_description: val.subreddits_description,
                            subreddits_url: val.subreddits_url,
                            subreddits_createdAt : val.subreddits_createdAt,
                            subreddits_updatedAt: val.subreddits_updatedAt
                        }
                        
                    }   
                    //console.log('this is the result', val);
            });
        
        });
    }
    
    
    getAllSubreddits() {
        return this.conn.query(
            `
            SELECT *
            FROM subreddits
            ORDER BY subreddits.createdAt DESC 
            LIMIT 25
            `
            );
    }
}

module.exports = RedditAPI;