# AWS Downloader/Uploader

- [Features](#features)
- [Setup](#setup)
- [Architecture](#architecture)
- [Flow of Application](#flow-of-application)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Other Future Improvements](#other-future-improvements)

## Features
- users are give the choice to download from or upload to an S3 bucket via an easy-to-use CLI
- the ability to adjust the max concurrent file transfers happening at once (defaults to 4)
- uploads will be encrypted using an AWS CMK which you provide

## Setup

### Dependencies
- Node v10.16.0

### Installation (Mac)
```sh
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
$ nvm intall
$ npm install
```

### Local Development
```sh
$ npm run build:start
> follow commands
```

## Architecture

### Typing and Code Consistency
- Typescript for safe typing and better developer experience with easier refactoring
- TSLint and Prettier for code consistency

### Dependency Injector
- use of dependency injector pattern for ease of mocking when testing
- an example of this being the AWS SDK S3 mock (`src/test/mocks/S3.ts`) allowing for testing of the FileTransfer classes by simulating emitting events for download progress and completion

### `FileTransfer` Interface
- interface which is implemented by FileDownload and FileUpload which are responsible for:
    - downloading from/uploading to S3 buckets
    - displaying status of progress
- an interface which is compatible to be implemented virtually by any class connecting to an API/interface to download/upload

### `ConcurrentFileTransfer` Class
- class which will download/upload any number of objects implementing the FileTransfer interface
- control concurrent parallel connections using `p-limit` library (defaults to 4 unless overridden in constructor)

## Error Handling

### Current State
- basic validations during CLI prompts are in place such as checking whether the folder to upload exists or folder with the same name of bucket wanting to be downloaded does not already exist
- any invalid inputs such as bad credentials will be caught and users will be notified via the CLI and be prompted to retry

### Future Improvements
- although all errors are gracefully caught and will not cause the program to terminate, the message is very generic so mapping all errors to more specific messages will be much more useful to end users

## Testing

### In Place
- mocha and chai for unit testing
- behaviour of ConcurrentFileTransfer and FileTransfer classes are covered quite well with the use of mock S3 and fs implementations
- code coverage included when running `npm run test:coverage`

### Future Improvements
- more thorough testing such as adding tests for helper files

## Other Future Improvements
- number of future improvements already mentioned above and not being able to be implemented due to time constraints
- more customisation via CLI such as:
  - download path
  - ACL
  - ability to upload without KMS encryption
