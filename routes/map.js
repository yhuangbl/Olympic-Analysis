var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var async = require('async');

exports.do_work = function(req, res) {
    oracledb.maxRows = 250;

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

            var query = "SELECT C.ISO3 AS COUNTRY, COUNT(H.MEDAL) AS NUM \
FROM COUNTRY C LEFT OUTER JOIN HAS_MEDAL H ON H.CODE = C.CODE \
GROUP BY C.ISO3 ORDER BY COUNTRY";

            connection.execute(query, [],
                function(err, result) {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    console.log(result);
                    get_best(connection, result);
                });
        });

    function get_best(connection, world) {
        var query = "select * from (select c.name, h.code, count(h.medal) as medal_num \
from Has_Medal h inner join Country c on h.code = c.code group by c.name, h.code \
order by medal_num DESC) where rownum <= 10";
        connection.execute(query, [],
            function(err, result) {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log(result);
                output_result(world, result);
                doRelease(connection);
            });
    }

    // output result as JSON
    function output_result(world, best) {
        var countries = {};
        for (var inx = 0; inx < world.rows.length; inx++) {
            var country_code = world.rows[inx][0];
            var medal_num = world.rows[inx][1];
            countries[country_code] = {};
            countries[country_code].numberOfThings = medal_num;
            if (medal_num < 100) {
                countries[country_code].fillKey = '< 100';
            } else if (medal_num >= 100 && medal_num < 500) {
                countries[country_code].fillKey = '< 500';
            } else {
                countries[country_code].fillKey = '>= 500';
            }
        }
        console.log(countries);

        res.render('map.jade', {
            title: "Map",
            data: countries,
            results: best
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
