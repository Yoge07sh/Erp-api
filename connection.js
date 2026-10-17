const mongoose = require('mongoose')

async function connect() {
    try {

        await mongoose.connect('mongodb://localhost:27017/rdcollege_erp')
        console.log('Database is Connected');

    } catch (error) {
        console.log(error);
    }
}

module.exports = connect