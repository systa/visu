# GitHub parser and linker

githubparser.js is a module that can get issues, issue events and the master branch commitsof a GitHub repository and send them to the data base as events and constructs. Githublinker.js module uses the parser module to get both issues and commits and then it links related issues and commits.

## Usage

### Authentication

The GitHub API works without authentication. For access to private resources authentication is required. Without authentication GitHub API imposes stricter rate limiting with 60 API calls per hour which can become an issue when fetching a lot of items. With authentication the limit is much higher.

This module supports authentication with OAuth 2 tokens. To get a token for your account go to github.com and then go to settings and then applications from where you can generate a token.

### Commandline

Use the parser.js script to run the githublinker or githubparser from the commandline:  
node parser.js command user repo token

The commandline arguments are:

- command (required): either commits to get the commits, issues to get issues and their events or link to get both
- user (required): the github user name of the repository owner
- repo (required): The name of the repository.
- token (optional): an OAuth 2 access token used to authenticate to GitHub.

### The modules

Use the githubparsers parse methods: parseCommits or parseIssues. Use the GitHub linkers link method. All take the same parameters: config and callback.

Config is a object with the following properties:

- user (required): the github user name of the repository owner
- repo (required): The name of the repository.
- token (optional): a OAuth 2 access token used to authenticate to GitHub.

The callback takes the following parameters:

- err: if something goes wrong an error object otherwise null
- result: an object containing information about how the parsing or linking went.

The result object has the following properties (this is not up to date):

- ids: the MongoDB ids of the added items.
- count: how many items should be added to the db
- addedCount: How many items were actually added to the database.
- failedCount: How many database insertions failed.
- updateCount: How many items should be updated after they have been saved. This has to do with adding references to items added later.
- updated: how many updates actually succeeded.
- failedUpdates: how many updates failed
