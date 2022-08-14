const express = require('express');
const app = express();
const pool = require('./queries');
var multiparty = require('multiparty');
const multer = require('multer');
const models = require('./models/index');
const statsDlog = require('node-statsd');
const dynamo = require("./config/dynamodb.config");
const sns = require("./config/sns.config");
const crypto= require('crypto')
client = new statsDlog();
const {
    uploadFile,
    deleteFile,
    getFileStream
} = require('./s3')
const upload = multer({
    dest: 'uploads/'
})
const fs = require('fs')
const util = require('util')
const unlinkFile = util.promisify(fs.unlink)
const {
    v4: uuidv4
} = require('uuid');
const hashBcrypt = require('bcrypt');
const {
    check,
    validationResult
} = require('express-validator');
const { StatsD } = require('node-statsd');

app.use(express.json());

app.get('/healthz', function (req, res) {
    console.log(" Logging GET '/healthz' ");
    client.increment('GET /healthz');
    res.send();
    res.status(200);
});


app.get("/v2/user/self", async (request, response) => {

    console.log(" Logging GET '/v2/user/self' ");
    client.increment('GET /v2/user/self');
    if (!request.headers.authorization) {
        response.status(401).send('Unauthorized')
    } else if (request.headers.authorization) {
        const authorizationHeader = request.headers.authorization.split(" ")[1];
        const authHeaderDecoded = decryptValue(authorizationHeader)
        const usernamePassword = authHeaderDecoded.split(":");
        const authTokenUsername = usernamePassword[0];
        const authTokenPassword = usernamePassword[1];
        let usernameDeCrypt;
        let passwordDecrypt;
        try {
            const responseValues = await pool.query(`SELECT username,status, password FROM userdetails where username='${authTokenUsername}'`);
            if (!responseValues[0][0]) {
                return response.status(400).send({
                    message: "No users found"
                });
            }
            usernameDeCrypt = responseValues[0][0]["username"]
            passwordDecrypt = responseValues[0][0]["password"]
            userStatus = responseValues[0][0]["status"]
        } catch (error) {
            console.log(error.stack);
            return;
        }

        if (authTokenUsername === usernameDeCrypt) {
            const comparePassword = hashBcrypt.compareSync(authTokenPassword, passwordDecrypt);
            let parseResponse;
            if (comparePassword && userStatus === "verified") {
                try {
                    const qryGetUser = await pool.query(`SELECT id, first_name, last_name, username, createdAt, updatedAt,status from userdetails where username='${authTokenUsername}'`);
                    parseResponse = qryGetUser[0][0];
                    const responseValues = {
                        id: parseResponse["id"],
                        first_name: parseResponse["first_name"],
                        last_name: parseResponse["last_name"],
                        username: parseResponse["username"],
                        createdAt: parseResponse["createdAt"],
                        updatedAt: parseResponse["updatedAt"],
                        status: parseResponse["status"]
                    }
                    response.status(200).json(responseValues);
                } catch (error) {
                    console.log(error);
                    response.status(500);
                }
            } else {
                response.status(401).send('Unauthorized')
            }
        }
    }

});
app.post("/v2/user", check('first_name').notEmpty().withMessage('First name cannot be empty'),
    check('last_name').notEmpty().withMessage('Last name cannot be empty'),
    check('username').notEmpty().withMessage('Username cannot be empty'),
    check('username').isEmail().withMessage('username is an invalid email'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
    async (request, response, next) => {

        console.log(" Logging POST '/v2/user' ");
        client.increment('POST /v2/user');
        
        try {
            console.log("inside post v2/user");
            const errors = validationResult(request);

            if (!errors.isEmpty()) {
                return response.status(400).json({
                    errors: errors.array()
                });
            }
            const {
                first_name,
                last_name,
                username,
                password
            } = request.body;

            const saltVal = hashBcrypt.genSaltSync(10);
            const encryptVal = hashBcrypt.hashSync(password, saltVal);
            console.log("After hashing");
            let newUser;
            const file = request.file;
            console.log(file);
            const description = request.body.description;
            console.log(`INSERT INTO userdetails(username, first_name, last_name, password, createdAt, updatedAt,id) VALUES('${username}', '${first_name}', '${last_name}', '${encryptVal}', current_timestamp, current_timestamp,'${uuidv4()}')`);
            const createNewUser = await pool.query(`INSERT INTO userdetails(username, first_name, last_name, password, createdAt, updatedAt,id) VALUES('${username}', '${first_name}', '${last_name}', '${encryptVal}', current_timestamp, current_timestamp,'${uuidv4()}')`);
            const currentUserValues = await pool.query(`SELECT id, first_name, last_name, password, createdAt, updatedAt from userdetails where username='${username}'`);
            console.log(`SELECT id, first_name, last_name, password, createdAt, updatedAt from userdetails where username='${username}'`);
            newUser = (await currentUserValues)[0][0];
            console.log("newUser", newUser);
            const parseResponse = {
                id: newUser["id"],
                first_name: newUser["first_name"],
                last_name: newUser["last_name"],
                createdAt: newUser["createdAt"],
                updatedAt: newUser["updatedAt"]
            }
            const token = crypto.randomBytes(16).toString("hex")
            //Add record in DynamoDB
            const putParams = {
              TableName: "TokenTable",
              Item: {
                username: { S: username },
                token: { S: token },
                ttl: {N: (Math.floor(Date.now()/1000) + 300).toString()},
              },
            };
            dynamo.dynamoDBClient.putItem(putParams, (err, putItemResponse) => {   
                if (err) {
                  console.error(`[ERROR]: ${err.message}`);
                  response.status(504).send("1");
                } else {
                  console.log(
                    `[INFO]: New user token uploaded to DynamoDB : ${token}`
                  );
                  //Publish in Amazon SNS
              const message = {
                Message: `${parseResponse} : ${token} : "String"`,
                TopicArn: "arn:aws:sns:us-east-1:596696200278:UserVerificationTopic",
                MessageAttributes: {
                  'emailid': {
                      DataType: 'String',
                      StringValue: request.body.username
                  },
                  'token': {
                    DataType: 'String',
                    StringValue: token
                }
              }
              };
              console.log("message is: ", message);
  
              sns.publishTextPromise.publish(message).promise().then(function (data1) {
                  console.log(
                    `[INFO]: Message ${message.Message} sent to the topic ${message.TopicArn}`
                  );
                  console.log("[INFO]: MessageID is " + data1.MessageId);
  
                  //response.status(201).json("User Created");
                })
                .catch(function (err) {
                  console.error(`[ERROR]: ${err.message}`);
                  //response.status(504).send("2");
                });
                }
              });
            //response.status(201).json("New User Created");
            response.status(201).json(parseResponse);

        } catch (error) {
            console.log("error", error);
            if (error.code === 'ER_DUP_ENTRY') {
                response.status(400).send('Email ID already exists');
            } else {
                response.status(500).send(error.Message);
            }
        }
    });
app.post("/v2/user", check('first_name').notEmpty().withMessage('First name cannot be empty'),
    check('last_name').notEmpty().withMessage('Last name cannot be empty'),
    check('username').notEmpty().withMessage('Username cannot be empty'),
    check('username').isEmail().withMessage('username is an invalid email'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
    async (request, response, next) => {

        console.log(" Logging POST '/v2/user' ");
        client.increment('POST /v2/user');
        try {
            console.log("inside post v2/user");
            const errors = validationResult(request);

            if (!errors.isEmpty()) {
                return response.status(400).json({
                    errors: errors.array()
                });
            }
            const {
                first_name,
                last_name,
                username,
                password
            } = request.body;

            const saltVal = hashBcrypt.genSaltSync(10);
            const encryptVal = hashBcrypt.hashSync(password, saltVal);
            console.log("After hashing");
            let newUser;
            console.log(`INSERT INTO userdetails(username, first_name, last_name, password, createdAt, updatedAt,id) VALUES('${username}', '${first_name}', '${last_name}', '${encryptVal}', current_timestamp, current_timestamp,'${uuidv4()}')`);
            const createNewUser = await pool.query(`INSERT INTO userdetails(username, first_name, last_name, password, createdAt, updatedAt,id) VALUES('${username}', '${first_name}', '${last_name}', '${encryptVal}', current_timestamp, current_timestamp,'${uuidv4()}')`);
            const currentUserValues = await pool.query(`SELECT id, first_name, last_name, password, createdAt, updatedAt from userdetails where username='${username}'`);
            console.log(`SELECT id, first_name, last_name, password, createdAt, updatedAt from userdetails where username='${username}'`);
            newUser = (await currentUserValues)[0][0];
            console.log("newUser", newUser);
            const parseResponse = {
                id: newUser["id"],
                first_name: newUser["first_name"],
                last_name: newUser["last_name"],
                createdAt: newUser["createdAt"],
                updatedAt: newUser["updatedAt"]
            }
            response.status(201).json("New User Created");
            response.status(201).json(parseResponse);

        } catch (error) {
            console.log("error", error);
            if (error.code === 'ER_DUP_ENTRY') {
                response.status(400).send('Email ID already exists');
            } else {
                response.status(500).send(error.Message);
            }
        }
    });

app.put("/v2/user/self", check('first_name').notEmpty().withMessage('First name cannot be empty'),
    check('last_name').notEmpty().withMessage('Last name cannot be empty'),
    check('username').notEmpty().withMessage('Username cannot be empty'),
    check('username').isEmail().withMessage('Username is an invalid email'),
    check('password').notEmpty().withMessage('Password cannot be empty'),
    async (request, response) => {

        console.log(" Logging PUT '/v2/user/self' ");
        client.increment('PUT /v2/user/self');
        const errors = validationResult(request);

        if (!errors.isEmpty()) {
            return response.status(400).json({
                errors: errors.array()
            });
        }
        if (!request.headers.authorization) {
            return response.status(401).send('Unauthorized')
        } else if (request.headers.authorization) {
            const valUpdateCheck = request.headers.authorization.split(" ")[1];
            const authHeaderDecoded = decryptValue(valUpdateCheck)
            const usernamePasswordUpdated = authHeaderDecoded.split(":");
            const tokenUsernameUpdated = usernamePasswordUpdated[0];
            const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!emailRegexp.test(tokenUsernameUpdated)) {
                return response.status(400).send({
                    message: "Enter email in proper format!! eg:abc@def.com"
                });
            }
            const tokenPasswordUpdated = usernamePasswordUpdated[1];
            let tokenUsernameDcrypt;
            let tokenPasswordDcrypt;
            try {
                const queryDbDetails = await pool.query(`SELECT username,status, password FROM userdetails where username='${tokenUsernameUpdated}'`);
                if (!queryDbDetails[0][0]) {
                    return response.status(400).send({
                        message: "Username cannot be changed"
                    });
                }
                tokenUsernameDcrypt = (await queryDbDetails)[0][0]["username"];
                tokenPasswordDcrypt = (await queryDbDetails)[0][0]["password"];
                userStatus = (await queryDbDetails)[0][0]["status"];
                if (tokenUsernameUpdated != request.body.username)
                    return response.status(400).send({
                        message: "Username cannot be changed"
                    });
            } catch (error) {
                console.log(error.stack);
                return;
            }
            if (tokenUsernameUpdated === tokenUsernameDcrypt) {
                const checkUpdatedPassword = hashBcrypt.compareSync(tokenPasswordUpdated, tokenPasswordDcrypt);
                if (checkUpdatedPassword && userStatus === "verified") {                    
                    try {
                        if (!request.body) {
                            response.status(400).send('Bad Request');
                        } else {
                            const requestedFirstname = request.body.first_name;
                            const requestedLastname = request.body.last_name;
                            const requestedUsername = request.body.username;
                            const requestedPassword = request.body.password;
                            const requestedSalt = hashBcrypt.genSaltSync(10);
                            const requestedHashing = hashBcrypt.hashSync(requestedPassword, requestedSalt);
                            const queryUpdateUser = await pool.query(`UPDATE userdetails SET first_name='${requestedFirstname}', last_name='${requestedLastname}', username='${requestedUsername}', password='${requestedHashing}', updatedAt=current_timestamp WHERE username ='${tokenUsernameUpdated}'`);
                            response.status(200).send('Information Update Completed')
                        }
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    response.status(401).send('Unauthorized')
                }
            }
        }
    });
app.post("/v2/user/self/pic", upload.single('file_name'),
    async (request, response) => {
        console.log(" Logging POST '/v2/user/self/pic' ");
        client.increment('POST /v2/user/self/pic');
        const file = request.file
        if (file.mimetype != 'image/jpg' && file.mimetype != 'image/jpeg' && file.mimetype != 'image/png') {
            return response.status(400).send('Upload valid image'); 
        }
        console.log(file);        
 
        const description = request.body.description
 
        var form = new multiparty.Form();

        const errors = validationResult(request);

        if (!errors.isEmpty()) {

        }
        if (!request.headers.authorization) {
            return response.status(401).send('Unauthorized')
        } else if (request.headers.authorization) {
            const valUpdateCheck = request.headers.authorization.split(" ")[1];
            const authHeaderDecoded = decryptValue(valUpdateCheck)
            const usernamePasswordUpdated = authHeaderDecoded.split(":");
            const tokenUsernameUpdated = usernamePasswordUpdated[0];
            const tokenPasswordUpdated = usernamePasswordUpdated[1];
            let tokenUsernameDcrypt;
            let tokenPasswordDcrypt;
            try {
                const queryDbDetails = await pool.query(`SELECT username,status, password,id FROM userdetails where username='${tokenUsernameUpdated}'`);
                if (!queryDbDetails[0][0]) {
                    return response.status(404).send({
                        message: "Username does not exist"
                    });
                }
                tokenUsernameDcrypt = (await queryDbDetails)[0][0]["username"];
                tokenPasswordDcrypt = (await queryDbDetails)[0][0]["password"];
                tokenUserId = (await queryDbDetails)[0][0]["id"];
                userStatus = (await queryDbDetails)[0][0]["status"];
            } catch (error) {
                console.log(error.stack);
                return;
            }
            if (tokenUsernameUpdated === tokenUsernameDcrypt) {
                const checkUpdatedPassword = hashBcrypt.compareSync(tokenPasswordUpdated, tokenPasswordDcrypt);
                if (checkUpdatedPassword && userStatus === "verified") {
                    try {
                        if (!request.body) {
                            response.status(400).send('Bad Request');
                        } else {
                            const querydeleteImageDtl = await pool.query(`Select * from images where user_id='${tokenUserId}'`);                                                        
                            const result = await uploadFile(file);
                            await unlinkFile(file.path)
                            console.log(result)
                            const requestedFilename = file.originalname;
                            const requestedUrl = result.Location;
                            //const requestedUpload_date = request.body.upload_date;
                            const requestedUser_id = request.body.user_id;
                            if(querydeleteImageDtl[0][0]){                           
                                var fileName = (await querydeleteImageDtl)[0][0]["url"];                             
                                const result = await deleteFile(fileName.split('/')[4]);
                                console.log(`UPDATE images set file_name='${requestedFilename}',url='${requestedUrl}' where user_id='${tokenUserId}'`);
                                const queryUpdateImage = await pool.query(`UPDATE images set file_name='${requestedFilename}',url='${requestedUrl}' where user_id='${tokenUserId}'`);
                            }else{                            
                            const queryInsertImage = await pool.query(`INSERT INTO images(user_id,file_name,url,id) VALUES ('${tokenUserId}','${requestedFilename}','${requestedUrl}','${uuidv4()}')`);
                            }
                            response.status(200).send('Image Upload Completed')
                        }
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    response.status(401).send('Unauthorized')
                }
            }
        }
    });
app.get("/v2/user/self/pic", async (request, response) => {
    console.log(" Logging GET '/v2/user/self/pic' ");
    client.increment('GET /v2/user/self/pic');

    if (!request.headers.authorization) {
        response.status(401).send('Unauthorized')
    } else if (request.headers.authorization) {
        const authorizationHeader = request.headers.authorization.split(" ")[1];
        const authHeaderDecoded = decryptValue(authorizationHeader)
        const usernamePassword = authHeaderDecoded.split(":");
        const authTokenUsername = usernamePassword[0];
        const authTokenPassword = usernamePassword[1];
        let usernameDeCrypt;
        let passwordDecrypt;
        try {
            const responseValues = await pool.query(`SELECT id,username,status, password FROM userdetails where username='${authTokenUsername}'`);
            if (!responseValues[0][0]) {
                return response.status(400).send({
                    message: "User Name does not exist"
                });
            }
            usernameDeCrypt = responseValues[0][0]["username"];
            passwordDecrypt = responseValues[0][0]["password"];
            idDecrypt = responseValues[0][0]["id"];
            userStatus = responseValues[0][0]["status"];

        } catch (error) {
            console.log(error.stack);
            return;
        }

        if (authTokenUsername === usernameDeCrypt) {
            const comparePassword = hashBcrypt.compareSync(authTokenPassword, passwordDecrypt);
            let parseResponse;
            if (comparePassword && userStatus === "verified") {
                try {
                    const qryGetUser = await pool.query(`SELECT * from images where user_id='${idDecrypt}'`);
                    parseResponse = qryGetUser[0][0];
                    var responseValues = {};
                   if(parseResponse!=undefined){
                     responseValues = {
                        id: parseResponse["id"],
                        user_id: parseResponse["user_id"],
                        file_name: parseResponse["file_name"],
                        url: parseResponse["url"],
                        upload_date: parseResponse["upload_date"],
                        status: parseResponse["status"]
                    }
                }else{
                    response.status(401).send('Please upload an image');
                }

                    response.status(200).json(responseValues);
                } catch (error) {
                    console.log(error);
                    response.status(500);
                }
            } else {
                response.status(401).send('Unauthorized')
            }
        }
    }

});
app.delete("/v2/user/self/pic",
    async (request, response) => {
        console.log(" Logging DELETE '/v2/user/self/pic' ");
        client.increment('DELETE /v2/user/self/pic');
        if (!request.headers.authorization) {
            return response.status(401).send('Unauthorized')
        } else if (request.headers.authorization) {
            const valUpdateCheck = request.headers.authorization.split(" ")[1];
            const authHeaderDecoded = decryptValue(valUpdateCheck)
            const usernamePasswordUpdated = authHeaderDecoded.split(":");
            const tokenUsernameUpdated = usernamePasswordUpdated[0];
            const tokenPasswordUpdated = usernamePasswordUpdated[1];
            let tokenUsernameDcrypt;
            let tokenPasswordDcrypt;
            try {
                const queryDbDetails = await pool.query(`SELECT username,status, password,id FROM userdetails where username='${tokenUsernameUpdated}'`);
                if (!queryDbDetails[0][0]) {
                    return response.status(400).send({
                        message: "Username does not exist"
                    });
                }
                tokenUsernameDcrypt = (await queryDbDetails)[0][0]["username"];
                tokenPasswordDcrypt = (await queryDbDetails)[0][0]["password"];
                userStatus = (await queryDbDetails)[0][0]["status"];
                tokenUserId = (await queryDbDetails)[0][0]["id"];
            } catch (error) {
                console.log(error.stack);
                return;
            }
            if (tokenUsernameUpdated === tokenUsernameDcrypt) {
                const checkUpdatedPassword = hashBcrypt.compareSync(tokenPasswordUpdated, tokenPasswordDcrypt);
                if (checkUpdatedPassword && userStatus === "verified") {
                    try {
                        if (!request.body) {
                            response.status(400).send('Bad Request');
                        } else {
                            const querydeleteImageDtl = await pool.query(`Select * from images where user_id='${tokenUserId}'`);                            
                            if(!querydeleteImageDtl[0][0])
                            return response.status(400).send({
                                message: "No image to delete"
                            });
                            var fileName = (await querydeleteImageDtl)[0][0]["url"];                             
                            const result = await deleteFile(fileName.split('/')[4]);
                            console.log(result);
                            const requestedFilename = request.body.file_name;
                            const requestedUrl = request.body.url;
                            const requestedUser_id = request.body.user_id;
                            const queryInsertImage = await pool.query(`Delete from images where user_id='${tokenUserId}'`);
                            response.status(200).send('Image Deleted Successfully')
                        }
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    response.status(401).send('Unauthorized')
                }
            }
        }
    });

    app.get("/v2/verifyUserEmail",
    async (req, res) => {
        console.log("VerifyUser endpoint hit");
  let email = req.query.email
  let token = req.query.token

    const queryDbDetails = await pool.query(`SELECT username, password,id FROM userdetails where username='${email}'`);
    if (!queryDbDetails[0][0]) {
        return res.status(400).send({
            message: "Username does not exist"
        });
    }
    else{
      //Get token from DynamoDB
      const getParams = {
        TableName: "TokenTable",
        Key: {
          username: { S: email },
        },
      };
      dynamo.dynamoDBClient.getItem(getParams, (err, getResponseItem) => {
        if (err) {
         console.log(`[ERROR]: ${err.message}`);
          res.status(504).send();
        } else {
          console.log(
            `[INFO]: User verification token retrieved from DynamoDB`
          );
          console.log("-----------------------------------"+getResponseItem.Item.ttl.N);
          console.log("token1 : "+token+":");
          console.log("token2 : "+getResponseItem.Item.token.S+":");
          console.log("getResponseItem.Item.token.S === token : "+getResponseItem.Item.token.S == token);
          console.log("Math.floor(Date.now()/1000) < getResponseItem.Item.ttl.N : "+Math.floor(Date.now()/1000) < getResponseItem.Item.ttl.N );
          console.log("Math.floor(Date.now()/1000) : "+ Math.floor(Date.now()/1000 ));
          console.log("getResponseItem.Item.ttl.N : "+ getResponseItem.Item.ttl.N );
          if ((getResponseItem.Item.token.S.trim() == token.trim())&& (Math.floor(Date.now()/1000) < parseInt(getResponseItem.Item.ttl.N))) {
            const queryUpdateUser =  pool.query(`UPDATE userdetails SET status='verified' WHERE username ='${email}'`);                            
            res.status(204).send();
          } else {
            console.log(`[ERROR]: Token mismatch`);
            res.status(400).json({
              success: false,
              message: "DDB Token and Params Token mismatch",
            });
          }
        }
      });
    }
  });
       

function decryptValue(password) {
    const value64Bit = Buffer.from(password, 'base64');
    const value = value64Bit.toString('utf-8');
    return value;
}

 models.sequelize.sync({ alter: true }).then((x) => {
    console.log('### Database Resynced !! ###');
}).catch(function (error) {
    console.log(error);
});

module.exports = app.listen(3000, () => console.log('Listening on port 3000'));

