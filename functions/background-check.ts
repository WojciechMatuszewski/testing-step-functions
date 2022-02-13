/**
 * A sample function that might throw an error that we would like to retry.
 */
const handler = async () => {
  return {
    status: "PASS"
  };
};

export { handler };
