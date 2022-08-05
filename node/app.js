const axios = require('axios');

step1URL = "https://consulat.gouv.fr/ambassade-de-france-au-cameroun/rendez-vous?name=Visas%20-%20CALENDRIER%20GENERAL";
step2URL = "https://api.consulat.gouv.fr/api/team/6215278c88d51bdd45ad276c/reservations-session";
//step3URL = "https://api.consulat.gouv.fr/api/team/6215278c88d51bdd45ad276c/reservations/availability?name=Visas - CALENDRIER GENERAL&date=2022-08-15&places=1&matching=&maxCapacity=1&sessionId=62d395721646f1559cae53b6";
excludeDates = "https://api.consulat.gouv.fr/api/team/6215278c88d51bdd45ad276c/reservations/exclude-days";
step3URL = "https://api.consulat.gouv.fr/api/team/6215278c88d51bdd45ad276c/reservations/availability?name=Visas%20-%20CALENDRIER%20GENERAL";


Date.prototype.addDays = function(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

const formatDate = (date) => {
    let d = new Date(date);
    let month = (d.getMonth() + 1).toString();
    let day = d.getDate().toString();
    let year = d.getFullYear();
    if (month.length < 2) {
      month = '0' + month;
    }
    if (day.length < 2) {
      day = '0' + day;
    }
    return [year, month, day].join('-');
  }

function getDates(excluded=[]) {
    var dateArray = new Array();
    var currentDate = new Date().addDays(1);
    for (let index = 0; index <= 45; index++) {
        currentDate = currentDate.addDays(index);
        formated = formatDate(currentDate);
        //if(!excluded.includes(formated) && formated!='2022-08-15')
        if(!excluded.includes(formated))
            dateArray.push(formatDate(currentDate));
    }
    return dateArray;
}

async function controler(req, response){
    console.log("### Start avail ### " + new Date().toISOString());
    try {
        result = new Array();
        await axios.get(step1URL)
        .then(async res=>{
            if(res.data.includes("<title>Une erreur est survenue</title>")){
                response.send({
                    error: true,
                    message: 'UNAVILEBLE_SERVICE'
                });
            }else{
                datas = res.data.split(",csrf:\"");
                if(datas.length==2){
                    headerToken = datas[1].split("\"")[0];
                    excludeSessionToken = res.data.split("b,_id:\"")[3].split("\"")[0];
                    await axios.post(step2URL, {}, {
                        headers: {
                            'x-troov-web':'com.troov.web',
                            'x-csrf-token': headerToken
                        }
                    })
                    .then(async s2res=>{
                        if(s2res.data._id){
                            headers = {
                                headers: {'x-troov-web':'com.troov.web'}
                            };
                            now = new Date().addDays(1);
                            sessionParam={};
                            sessionParam[excludeSessionToken] = 1
                            params = {
                                start: now.toISOString(),
                                end: now.addDays(45).toISOString(),
                                sessionId: s2res.data._id,
                                session: sessionParam
                            }
                            await axios.post(excludeDates, params,headers).then(async excludeData =>{
                                let dates = getDates(excludeData.data);
                                console.log("Les dates", dates);
                                for await (let date of dates) {
                                    let url = step3URL + "&date=" + date;
                                    url += "&places=1&matching=&maxCapacity=1";
                                    url += "&sessionId="+s2res.data._id;
                                    await axios.get(url, headers).then( finalResult => {
                                        result.push({
                                            date: date,
                                            avails: finalResult.data
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
                response.send(result);
            }
        });
    } catch (error) {
        response.send({
            error: true,
            message: error.message
        });
    }
}

express = require('express');
const router = express.Router();

cors = require('cors');

app = express();

app.use(cors({
    origin: "*",
    methods: "*"
}));

router.get("/avail", controler);

app.use(router);

app.listen(3000, ()=>{
    console.log("Server started on port 3000 at " + (new Date()).toISOString());
});
