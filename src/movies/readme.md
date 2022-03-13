# Movies
A simple telegram user bot to serve users with movies and shows (we refer them all as 'movie' here.)

## File-Structure
**The outer files**

Include root files.
- **index.js** The program start and run from here.
- **functions.js** Exports functions to be used by other modules.
- **variables.js** Exports variables to be used by other modules.
- **readme.md** This is me 😊

**Data-store**

Used as in-file database.
- **users-data** Store users data.
    - **confirmed-users.json** Store array of confirmed users id.
    - **all-users** Store json files named after user_ids, each file contains detailed information about the user.
- **movies-data** [NOT_STRUCTURED_YET]
- **modules** Modules to be used in the app
    - **user** A class to deal with users data, well defined in [entities](#entities) section.
## Activities
**Movies get uploaded**
- Movies sent to a a channel known by this app,
- The app save info about the movie from there caption and other internal structures.

**Users get registered**
- By sending messages to the account running this app.

**Users search for movies**
- Specifying name or key-words,
- The app looks for the movie and respond accordingly.

## Entities

### User
A class to deal with users data, defined in [modules/user.json](modules/user.js)

**Fields**

- id
- name
- country
- phone
- confirmed `default: false`
- verified `default: true`
- blocked `default: false`

**Methods**
- constructor(id)
- static isRegistered(id)
- get fieldName()
- set fieldName()
- get basicInfo()
- get fullInfo()