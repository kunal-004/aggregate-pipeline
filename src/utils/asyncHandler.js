const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

// const asyncHandler = (fn) => async (res, req, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.send(error.code || 500).json({
//       status: false
//       message: error.message,
//     });
//   }
// };

export { asyncHandler };
