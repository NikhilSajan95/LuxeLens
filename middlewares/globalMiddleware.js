const globalMiddleware = (err, req, res, next) => {
  console.log("An error occured", err);
  res.status(500).send('something went wrong')
};






module.exports = globalMiddleware