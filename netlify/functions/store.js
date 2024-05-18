exports.handler = async (event, context) => {
  const OW_API_KEY = process.env.OW_API_KEY;
  const GMAPS_API_KEY = process.env.GMAPS_API_KEY;

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Secrets accessed successfully" }),
  };
};