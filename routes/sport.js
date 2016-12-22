var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

exports.redirect = function(req, res) {
    res.render('sport_index.jade');
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

            var input_sport = req.query.sport;
            var query = "SELECT C.name, COUNT(H.event) as medal_num\
                    FROM Has_Medal H INNER JOIN Country C ON H.code = C.code";
            if (input_sport) {
                query = "SELECT * FROM (" + query + " WHERE H.sport = '" + input_sport +
                    "' GROUP BY C.name ORDER BY medal_num DESC) WHERE ROWNUM <= 5";
            }
            console.log(query);

            connection.execute(query, [],
                function(err, result) {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    console.log(result);
                    find_common_factors(connection, input_sport, result);
                    // output_result(input_sport, result);
                    // doRelease(connection);
                });
        });

    function find_common_factors(connection, input_sport, countries) {
        var query = "SELECT C2.name, C2.code, C2.population, C2.GDP, C2.region FROM \
(SELECT inside_code FROM (SELECT C.name, H.CODE AS inside_code, COUNT(H.event) as medal_num \
FROM Has_Medal H INNER JOIN Country C ON H.code = C.code WHERE H.sport = '" + input_sport +
            "' GROUP BY C.name, H.CODE ORDER BY medal_num DESC) WHERE ROWNUM <= 5) \
INNER JOIN COUNTRY C2 ON inside_code = C2.CODE";
        console.log(query);

        connection.execute(query, [],
            function(err, result) {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log(result);
                output_result(input_sport, countries, result);
                doRelease(connection);
            });
    }

    function output_result(input_sport, countries, results) {
        // define small: < 0.5 billion; mediume >= 0.5 billion and < 10 billion; large >= 10 billion
        var population = {
            small: 0,
            medium: 0,
            large: 0
        }
        var income_name = ["Low income", "Upper middle income", "High income", "Lower middle income"]
        var income = {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        }
        var region_name = ["Asia-Pacific", "North America", "Europe", "Africa", "Latin America"]
        var region = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0
        }

        for (var inx = 0; inx < results.rows.length; inx++) {
            var the_population = results.rows[inx][2];
            if (the_population < 500, 000) {
                population["small"] += 1;
            } else if (the_population >= 500, 000 && the_population < 10, 000, 000) {
                population["medium"] += 1;
            } else {
                population["large"] += 1;
            }

            var the_income = results.rows[inx][3];
            for (var i = 0; i < income_name.length; i++) {
                if (income_name[i] == the_income) {
                    income[i] += 1;
                    break;
                }
            }

            var the_region = results.rows[inx][4];
            for (var i = 0; i < region_name.length; i++) {
                if (region_name[i] == the_region) {
                    region[i] += 1;
                    break;
                }
            }
        }

        var common = [];

        for (var key in population) {
            if (population.hasOwnProperty(key)) {
                if (population[key] > 2) {
                    common.push(key.concat(" population"));
                    break;
                }
            }
        }

        for (var key in income) {
            if (income.hasOwnProperty(key)) {
                if (income[key] > 2) {
                    common.push(income_name[key]);
                    break;
                }
            }
        }

        for (var key in region) {
            if (region.hasOwnProperty(key)) {
                if (region[key] > 2) {
                    common.push(region_name[key]);
                    break;
                }
            }
        }

        console.log(common);

        res.render('sport.jade', {
            title: "The top countries in " + input_sport,
            input_sport: input_sport,
            results: countries,
            factors: common
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
