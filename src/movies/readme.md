# Movies

A simple telegram user bot to serve users with movies and shows (we refer them all as 'movie' here.)

## File-Structure

**The outer files**

Include root files.

- **index.js** | The program start and run from here.
- **functions.js** | Exports functions to be used by other modules.
- **variables.js** | Exports variables to be used by other modules.
- **readme.md** | This is me 😊

**Data-store**

Used as in-file database.

- **users-data** | Store users data.
  - **users** | Store json files named after user_ids, each file contains detailed information about the user.
- **movies-data** | [NOT_STRUCTURED_YET]
- **modules** | Modules to be used in the app
  - **user** | A class to deal with users data, well defined in [entities](#entities) section.

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
- confirmed | _default: false_
- verified | _default: true_
- blocked | _default: false_

**Methods**

- constructor(id)
- static isRegistered(id)
- get id()
- get basicInfo()
- get fullInfo()
- save()

## Flow

1.  **New Incoming Private Chat**

    1.1 **Chat_Id in Range**

    &emsp; &emsp; 1.1.1 **Unregistered** | Welcome, ask for name

    &emsp; &emsp; 1.1.2 **On-Registration**

    &emsp; &emsp; &emsp; &emsp; 1.1.2.1 **Acceptable** | To the next step

    &emsp; &emsp; &emsp; &emsp; 1.1.2.2 **Unacceptable** | Tell the error, ask again

    &emsp; &emsp; 1.1.3 **Registered** | Ask to choose best option out of the given choices

    &emsp; &emsp; 1.1.4 **Un-Approved** | Tell to wait until approval

    &emsp; &emsp; 1.1.5 **Blocked** | Tell they can't be served

    1.2 **Chat_Id Out of Range** | Tell they can't be served

2.  **New Outgoing Channel Message**
