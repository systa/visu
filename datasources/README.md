Data Sources
==========

Data collectors and parsers for the data model.

Note: this is not run within the docker containers. Requires installing node. Run ```sudo npm install``` within a directory in order to use the parsers.

Log
-------------
Usage data collector for Kactus2. Use file *log.txt* as input.

``` node collector2.js```

Issue Collector
-------------
Issue data collector for GitHub, Gitlab, Jenkins and Jira. See dedicated README for further instructions.

``` node collector.js```

Git Parser
-------------
Issue data collector for GitHub. See dedicated README for further instructions.

Agilefant Parser
-------------
Data collector for Agilefant data.

``` node agilefantparser.js "repo_url" "project id" "email" "password"```