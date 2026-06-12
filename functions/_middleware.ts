export const onRequest: PagesFunction = async (context) => {
  return await context.next();
};
