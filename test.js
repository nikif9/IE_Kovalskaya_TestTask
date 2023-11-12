const axios = require('axios');

const url = 'http://localhost:3000/updateBalance';
const requestData = { "userId": 1, "amount": -2 };
const numberOfRequests = 10000;

async function sendRequests() {
  try {
    const requests = Array.from({ length: numberOfRequests }, (_, index) =>
      axios.put(url, requestData)
        .then(() => ({ success: true }))
        .catch(error => ({ success: false, error: error.message }))
    );

    const results = await Promise.all(requests);

    const successfulRequests = results.filter(result => result.success);
    const failedRequests = results.filter(result => !result.success);

    console.log(`Total Requests: ${numberOfRequests}`);
    console.log(`Successful Requests: ${successfulRequests.length}`);
    console.log(`Failed Requests: ${failedRequests.length}`);

    // if (failedRequests.length > 0) {
    //   console.error('Failed Requests:', failedRequests);
    // } else {
    //   console.log('All requests were successful.');
    // }
  } catch (error) {
    console.error('Error sending requests:', error.message);
  }
}

sendRequests();
