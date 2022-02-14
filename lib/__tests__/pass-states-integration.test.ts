import { GenericContainer, StartedTestContainer } from "testcontainers";
import { PassStatesIntegration } from "../pass-states-integration";
import * as cdk from "aws-cdk-lib";
import {
  CreateStateMachineCommand,
  GetExecutionHistoryCommand,
  SFNClient,
  StartExecutionCommand
} from "@aws-sdk/client-sfn";
import waitFor from "wait-for-expect";

let container: StartedTestContainer | undefined;

beforeAll(async () => {
  container = await new GenericContainer("amazon/aws-stepfunctions-local")
    .withExposedPorts(8083)
    .withEnv("AWS_DEFAULT_REGION", process.env.AWS_REGION)
    .start();
}, 15_000);

afterAll(async () => {
  await container?.stop();
}, 15_000);

test("Handles the failure of the BackgroundCheck step", async () => {
  const stack = new cdk.Stack();
  const construct = new PassStatesIntegration(stack, "PassStatesIntegration");

  const transformDataStepDefinition = construct.transformDataStep.toStateJson();
  const stepFunctionDefinition = JSON.stringify({
    StartAt: "TransformDataStep",
    States: {
      TransformDataStep: {
        ...transformDataStepDefinition,
        End: true
      }
    }
  });

  const sfnLocalClient = new SFNClient({
    endpoint: `http://localhost:${container?.getMappedPort(8083)}`
  });

  const createLocalSFNResult = await sfnLocalClient.send(
    new CreateStateMachineCommand({
      definition: stepFunctionDefinition,
      name: "PassStates",
      roleArn: "arn:aws:iam::012345678901:role/DummyRole"
    })
  );

  const startLocalSFNExecutionResult = await sfnLocalClient.send(
    new StartExecutionCommand({
      stateMachineArn: createLocalSFNResult.stateMachineArn,
      input: JSON.stringify({
        firstName: "John",
        lastName: "Doe"
      })
    })
  );

  await waitFor(async () => {
    const getExecutionHistoryResult = await sfnLocalClient.send(
      new GetExecutionHistoryCommand({
        executionArn: startLocalSFNExecutionResult.executionArn
      })
    );

    const successState = getExecutionHistoryResult.events?.find(
      event => event.type == "ExecutionSucceeded"
    );

    expect(successState?.executionSucceededEventDetails?.output).toEqual(
      JSON.stringify({ payload: "John Doe" })
    );
  });
}, 20_000);
