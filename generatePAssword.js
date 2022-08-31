const bcrypt = require('bcrypt');

bcrypt.hash(
  '123456',
  Number('$2b$10$44gNUOnBXavOBMPOqzd48e'),
).then(hash => {console.log('hash',hash)}).catch(e=>{console.log("error", e)});
