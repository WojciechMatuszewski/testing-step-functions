import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({});

test("Saves the user in the DynamoDB table", async () => {
  const startExecutionResult = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: process.env.SIMPLISTIC_E2E_STEP_FUNCTION_ARN,
      input: JSON.stringify({
        firstName: "John",
        lastName: "Doe"
      })
    })
  );

  await expect({
    region: process.env.AWS_REGION,
    table: process.env.SIMPLISTIC_E2E_DATA_TABLE_NAME
  }).toHaveItem(
    {
      PK: `USER#${startExecutionResult.executionArn}`
    },
    {
      PK: `USER#${startExecutionResult.executionArn}`,
      firstName: "John",
      lastName: "Doe"
    }
  );
}, 15_000);
