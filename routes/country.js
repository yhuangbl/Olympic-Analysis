var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = ''; // mongodb connection string

exports.redirect = function(req, res) {
    res.render('country_index.jade');
};

exports.do_work = function(req, res) {

    oracledb.getConnection({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString
        },
        function(err, connection) {
            if (err) {
                console.error(err.message);
                return;
            }

            var input_country = req.query.country;
            var query = "SELECT NAME FROM COUNTRY WHERE CODE='" + input_country + "'";

            connection.execute(query, [],
                function(err, result) {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    console.log(result);
                    var country_name = result.rows[0][0];
                    best_sports(connection, input_country, country_name);
                })

        });

    function best_sports(connection, input_country, country_name) {
        var query = "SELECT M.sport, COUNT(M.event) as numMedal\
                FROM Has_Medal M INNER JOIN Country C ON M.code = C.code";
        if (input_country) {
            query = "SELECT * FROM (" + query + " WHERE C.code = '" + input_country +
                "' GROUP BY M.sport ORDER BY numMedal DESC) WHERE ROWNUM <= 5";
        }
        console.log(query);

        connection.execute(query, [],
            function(err, result) {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log(result);
                best_athlete(connection, input_country, country_name, result);

            });
    }

    function best_athlete(connection, input_country, country_name, sports) {
        var query = "SELECT NAME, NUM FROM \
        (SELECT A.NAME, W.ID, COUNT(W.MEDAL) AS NUM FROM WINS_MEDAL W \
        INNER JOIN ATHLETE A ON W.ID = A.ID \
        WHERE A.COUNTRY='" + input_country + "'GROUP BY A.NAME, W.ID ORDER BY NUM DESC) WHERE ROWNUM <= 5";
        console.log(query);

        connection.execute(query, [],
            function(err, result) {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log(result);
                doRelease(connection);
                query_mongo(input_country, country_name, sports, result);

            });
    }

    function query_mongo(input_country, country_name, sports, athletes) {
        console.log("query mongo function");
        MongoClient.connect(url, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                //HURRAY!! We are connected. :)
                console.log('Connection established to', url);

                // Get the documents collection
                var collection = db.collection('growth');

                // Insert some users
                collection.find({
                    code: input_country
                }).toArray(function(err, result) {
                    if (err) {
                        console.log(err);
                    } else if (result.length) {
                        console.log('Found:', result);
                        output_result(input_country, country_name, sports, athletes, result);
                    } else {
                        console.log(result);
                        console.log('No document(s) found with defined "find" criteria!');
                        output_result(input_country, country_name, sports, athletes, result);
                    }
                    //Close connection
                    db.close();
                });
            }
        });
    }

    function output_result(input_country, country_name, sports, athletes, result) {
        var yearStart = 1896;
        var yearEnd = 2008;
        var years = [];
        for (var i = yearStart; i <= yearEnd; i += 4) {
            years.push(i);
        }

        if (result.length) {
            var records = result[0]["record"];
            console.log(records);
            for (var i = 0; i < years.length; i++) {
                if (!(records.hasOwnProperty(years[i]))) {
                    records[years[i]] = 0;
                }
            }
            console.log(records)
        } else {
            var records = {};
            for (var i = 0; i < years.length; i++) {
                if (!(records.hasOwnProperty(years[i]))) {
                    records[years[i]] = 0;
                }
            }
        }

        var data = [{
            "Data": [
                //     {
                //     "Year": "1896",
                //     "Value": "63.4"
                // }, {
                //     "Year": "1900",
                //     "Value": "58.0"
                // }, {
                //     "Year": "1904",
                //     "Value": "53.3"
                // }, {
                //     "Year": "1908",
                //     "Value": "56.3"
                // }
            ]
        }];

        for (var key in records) {
            if (records.hasOwnProperty(key)) {
                var obj = {};
                obj["Year"] = key;
                obj["Value"] = records[key];
                console.log(obj);
                data[0]["Data"].push(obj);

            }
        }
        console.log(data);

        res.render('country.jade', {
            title: "The dominant sport in " + country_name,
            input_country: country_name,
            results: sports,
            athletes: athletes,
            records: data
        });
    }

    function doRelease(connection) {
        connection.release(
            function(err) {
                if (err) {
                    console.error(err.message);
                }
            });
    }
};
