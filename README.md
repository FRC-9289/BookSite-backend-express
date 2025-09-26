# This is the repository for the Backend fo the Booksite #

## Repo Info

`/db`:
    * Manages db setup
    * All database functionality and access is managed there (CRUD)
`/middleware`
    * Manages authorization to accessing the database and functionality of the backend
    * Currently using JWT (JSON Web Tokens)
      * <Header>.<Payload>.<Signature> bearer (Do your research)
  
`/models`
    * Manages data schemas
      * e.g the user schema for students are `email`, etc

`\routes`
    * Store routes here
    * Store functionality in another directory, call the function when accessing the route
    * Always use authorization on routers
  
## Repo Setup
1. `npm install`
2. Make sure you have `mongodb` and (Mongo DB Compass)[https://www.mongodb.com/products/tools/compass] downloaded on your laptop
3. For running this server
   1. `npm start`
4. For tests, use [Postman](https://www.postman.com) download community version