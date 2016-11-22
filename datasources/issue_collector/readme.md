# Issue collector

A command line utility that can collect issue management information from various web based sources and send them to the db in a unified format. The api of the source has to be described by a js file in the apis directory. Currently can collect issues, milestones and issue comments. Issues and milestones are constructs and comments are events. There are api description files for GitLab and GitHub.

## Usage

First run npm install to install dependencies. Then to run the collector:

node collector.js

When started the user is first asked to select the source from where issue data is fetched. Then the user is asked to choose an authentication method from those that the source supports. Finally the user is asked various source dependent parameters required to fetch issue data from a specific project.

## Example input

The file example_input.txt contains input for the issue collector that fetches issue data from a GitHub [test repository](https://github.com/ohylli/test-repo). It contains two issues, a milestone and few comments. To use the file, direct the files content as input for the issue collector:   
node collector.js < example_input.txt