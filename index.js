const getContent = function(url) {
    // I got the 'getContent' function from here: https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
    // return new pending promise
    return new Promise((resolve, reject) => {
      // select http or https module, depending on reqested url
      const lib = url.startsWith('https') ? require('https') : require('http');
      const request = lib.get(url, (response) => {
        // handle http errors
        if (response.statusCode < 200 || response.statusCode > 299) {
           reject(new Error('Failed to load page, status code: ' + response.statusCode));
         }
        // temporary data holder
        const body = [];
        // on every content chunk, push it to the data array
        response.on('data', (chunk) => body.push(chunk));
        // we are done, resolve promise with those joined chunks
        response.on('end', () => resolve(body.join('')));
      });
      // handle connection errors of the request
      request.on('error', (err) => reject(err))
      })
  };


async function checkAndNotify () {
    
    const {
        DEBUG_GROUP,
        TARGET_GROUP,
        WHOIS_KEY,
        TARGET_DOMAIN,
        TELEGRAM_BOT_TOKEN
    } = process.env;

    const domain = TARGET_DOMAIN;
    const checkDomainUrl = `https://domain-availability-api.whoisxmlapi.com/api/v1?mode=DNS_AND_WHOIS&apiKey=${WHOIS_KEY}&domainName=${domain}`
    const mainTelegramChannel = TARGET_GROUP;
    const debugTelegramChannel = DEBUG_GROUP;
    let targetTelegramChannel;
    let message;
    try {
        const domainStatus = await getContent(checkDomainUrl);
        const availability = JSON.parse(domainStatus).DomainInfo.domainAvailability;
        message = `The domain ${domain} is ${availability}`;
        if (availability !== 'UNAVAILABLE'){
            targetTelegramChannel = mainTelegramChannel;
            message = `${domain} is ${availability} \xF0\x9F\x8F\x83`;
        } else {
            message = `${domain} is still taken \xE2\x8F\xB3`;
            targetTelegramChannel = debugTelegramChannel;
        }
    }catch(error){
        targetTelegramChannel = mainTelegramChannel;
        message = error;
        console.error(error);
    }
        
    await getContent(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${targetTelegramChannel}&text=${message}`)
    .then((html) => console.log(html))
    .catch((err) => console.error(err));
}

exports.handler = async (event) => {
  await checkAndNotify();
};

