import { writeFileSync } from "fs";
import { join } from "path";
import { constantCase } from "change-case";
import * as prettier from "prettier";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  Output
} from "@aws-sdk/client-cloudformation";

const cfnClient = new CloudFormationClient({});

async function main() {
  const stackName = process.argv[2];
  if (!stackName) {
    throw new Error("Stack name is required");
  }

  const stackOutputs = await cfnClient.send(
    new DescribeStacksCommand({
      StackName: stackName
    })
  );

  const rootPath = join(__dirname, "../");
  const outputs = stackOutputs.Stacks?.[0].Outputs ?? [];

  await Promise.all([
    createEnvFile(outputs, rootPath),
    createTypingsFile(outputs, rootPath)
  ]);
}

main();

async function createEnvFile(stackOutputs: Output[], rootPath: string) {
  const envFileContents = stackOutputs.reduce((envFileContents, output) => {
    const envOutputKey = constantCase(output.OutputKey as string);
    const envOutputValue = output.OutputValue as string;

    envFileContents += `${envOutputKey}=${envOutputValue}\n`;
    return envFileContents;
  }, "");

  const envFilePath = join(rootPath, ".env");
  writeFileSync(envFilePath, envFileContents);
}

async function createTypingsFile(stackOutputs: Output[], rootPath: string) {
  const typingsFileContents = stackOutputs.reduce(
    (typingsFileContents, output) => {
      const envOutputKey = constantCase(output.OutputKey as string);
      const envOutputValue = output.OutputValue as string;

      typingsFileContents += `${envOutputKey}:"${envOutputValue}";\n`;
      return typingsFileContents;
    },
    ""
  );

  const typingsFile = prettier.format(
    `
    declare namespace NodeJS {
      export interface ProcessEnv {
        ${typingsFileContents}
      }
    }
  `,
    { parser: "typescript" }
  );
  const typingsFilePath = join(rootPath, "env.d.ts");
  writeFileSync(typingsFilePath, typingsFile);
}
