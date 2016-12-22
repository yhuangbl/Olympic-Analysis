var express = require('express'),
    routes = require('./routes'),
    country = require('./routes/country'),
    sport = require('./routes/sport'),
    map = require('./routes/map');

var app = express();
init_app(app);

app.get('/', routes.do_work);
app.get('/country', country.do_work);
app.get('/redirect_country', country.redirect);
app.get('/sport', sport.do_work);
app.get('/redirect_sport', sport.redirect);
app.get('/map', map.do_work);
app.use(express.static(__dirname + '/public'));
app.use('/scripts', express.static(__dirname + '/node_modules/datamaps/dist/'));

app.listen('8080', function() {
    console.log('Server running on port 8080');
});

function init_app() {
    // Use Jade to do views
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
}
