require('dotenv').config();
const controller = require('./src/controllers/admin-coverage-ui.controller');

(async () => {
  try {
    const req = { query: { gap_type: 'all', page: 1, limit: 25 }, user: { industry: 'general' } };
    let resData = null;
    const res = {
      json: (data) => { resData = data; },
      status: (code) => ({ json: (data) => { resData = data; } })
    };
    
    await controller.getGapResolution(req, res);
    console.log('Gap Resolution Response:');
    console.log(JSON.stringify(resData, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
  
  setTimeout(() => process.exit(0), 500);
})();
