# Testing AWS Step Functions flows

This repository contains examples of how one might test various AWS Step Functions flows.

The test files are located in the `lib/__tests__` directory.

## Deployment

1. `npm run boostrap`
2. `npm run deploy`

## Running the tests

1. Ensure that Docker is running.

2. Pull the [_aws-stepfunctions-local_](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-local-docker.html) image.

3. `npm run test`
