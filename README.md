# SENSE Discord BOT

## What is it?

It's a discord which allows discord members to publish tweets on a specific account with a Discord channel.

Everyone who can send message in the channel can submit a tweet.
Everyone who can react message can vote for tweeting a message.

## Setup

- create a discord bot at https://discord.com/developers
- get keys and tokens for your Twitter account, creating a project at https://developer.twitter.com/en/portal/projects/
- create a `.env` file in the root directory of the project, following [`.env.example`]()
- run `npm install`
- run `npm start`

## Commands

- /tweetschannel <channel>: set the channel where tweets submit can be voted
- /tweetsemoji <emoji>: set the emoji for voting
- /tweetsemojicount <count>: set the number of emoji vote for publishing

## Credits

- [Ambi](https://github.com/ptlc8)