# Butler JCR Website

This is the light-weight system, running on Amazon AWS (Lambda, API Gateway - serverless architecture) for the main public part of the Josephine Butler College JCR website.

Although quite a bit of this is based on Ned Reid's version, I have chosen to use a serverless architecture to save costs. I am also not a fan of React whatsoever, given how weakly it performs when you don't have much internet speed (I have worked on this quite a bit on the train) - so for digital accessibility, I have chosen serverless.

I have also divided the website into a much lightweight public side, and then the private side, with much more data which is being protected behind this so-called password wall.

## Working On It

You must have node-js and npm installed. Node version 20, and npm version 10 onwards will work. 

1. Git pull this
2. To have functionality with the database, create a `.env` file in the root, and config it with the AWS keys:
```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=eu-west-2
```
3. Install using `npm install`
4. Use `node .` to run. Noting that `local.js` is the endpoint we use to test the project locally and is ignored by Lambda - `index.js` is what AWS Lambda reads.

This project will auto-deploy on the `main` branch of the GitHub; use the `local.js`

Note that `aws-sdk` stuff is already available on Lambda, so installing any of this must be done by `npm install ... -save-dev` - everything
else by basic `npm install`. Express and dotnet are not used on there, and only for local testing.

## Notices
- Adapted from [Ned Reid's Version](https://github.com/NedReid/ButlerJCRWebsite)
- Complements [the public website](https://github.com/premraghvani/butlerjcr-website/)

## Credits for Other Items
- Family Trees, https://www.npmjs.com/package/relatives-tree
- Tables, https://datatables.net/
- Email Templates, https://codesandbox.io/p/sandbox/email-template-otp-2cfyn2