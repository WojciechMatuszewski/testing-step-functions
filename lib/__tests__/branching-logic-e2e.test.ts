import {
  CreateStateMachineCommand,
  DescribeStateMachineCommand,
  SFNClient,
  StartExecutionCommand
} from "@aws-sdk/client-sfn";
import { join } from "path";
import { GenericContainer, StartedTestContainer } from "testcontainers";

let container: StartedTestContainer | undefined;

beforeAll(async () => {
  const mockConfigPath = join(__dirname, "./branching-logic-e2e.mocks.json");
  container = await new GenericContainer("amazon/aws-stepfunctions-local")
    .withExposedPorts(8083)
    .withBindMount(mockConfigPath, "/home/branching-logic-e2e.mocks.json", "ro")
    .withEnv("SFN_MOCK_CONFIG", "/home/branching-logic-e2e.mocks.json")
    .withEnv("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID as string)
    .withEnv(
      "AWS_SECRET_ACCESS_KEY",
      process.env.AWS_SECRET_ACCESS_KEY as string
    )
    /**
     * For federated credentials (for example, SSO), this environment variable is required.
     */
    .withEnv("AWS_SESSION_TOKEN", process.env.AWS_SESSION_TOKEN as string)
    .withEnv("AWS_DEFAULT_REGION", process.env.AWS_REGION)
    .start();
}, 15_000);

afterAll(async () => {
  await container?.stop();
}, 15_000);

test("Handles the failure of the BackgroundCheck step", async () => {
  const sfnClient = new SFNClient({});

  const describeStepFunctionResult = await sfnClient.send(
    new DescribeStateMachineCommand({
      stateMachineArn: process.env.BRANCHING_LOGIC_E2E_STEP_FUNCTION_ARN
    })
  );
  const stepFunctionDefinition =
    describeStepFunctionResult.definition as string;
  const stepFunctionRoleARN = describeStepFunctionResult.roleArn as string;

  const sfnLocalClient = new SFNClient({
    endpoint: `http://localhost:${container?.getMappedPort(8083)}`
  });

  const createLocalSFNResult = await sfnLocalClient.send(
    new CreateStateMachineCommand({
      definition: stepFunctionDefinition,
      name: "BranchingLogic",
      roleArn: stepFunctionRoleARN
    })
  );

  const startLocalSFNExecutionResult = await sfnLocalClient.send(
    new StartExecutionCommand({
      stateMachineArn: `${
        createLocalSFNResult.stateMachineArn as string
      }#ErrorPath`,
      input: JSON.stringify({
        firstName: "John",
        lastName: "Doe"
      })
    })
  );

  await expect({
    region: process.env.AWS_REGION,
    table: process.env.BRANCHING_LOGIC_E2E_DATA_TABLE_NAME
  }).toHaveItem(
    {
      PK: `USER#${startLocalSFNExecutionResult.executionArn}`
    },
    {
      PK: `USER#${startLocalSFNExecutionResult.executionArn}`,
      firstName: "John",
      lastName: "Doe",
      backgroundCheck: "ERROR"
    }
  );
}, 50_000);
