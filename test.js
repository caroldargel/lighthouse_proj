const db = require('monk')('mongodb://appUser:appUserPassword@localhost:27017/lighthouse')
const collection = db.get('reports')

db.then(() => console.log("Connected!"))

collection.insert([{ a: 1 }, { a: 2 }, { a: 3 }])
    .then((docs) => {
        // docs contains the documents inserted with added **_id** fields
        // Inserted 3 documents into the document collection
    }).catch((err) => {
        // An error happened while inserting
    }).then(() => db.close())