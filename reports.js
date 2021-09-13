//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//  Listen on a port for web requests for reports, and display them
//---------------------------------------------------------------------------
// Modifications
//===========================================================================
//---------------------------------------------------------------------------

const config = require("config")
//const express = require('express')
const mysql = require('mysql')
const fastify = require('fastify')({logger: false})
const fs = require('fs')

const cli_args = require('commander');
cli_args.addHelpText('after', `
Here is what the config file should like like in ./config/default.toml

[sql]
username = ""
password = ""
database = ""
host = ""

[report]
logger_name = ""
log_file = ""
listen_host = "0.0.0.0"
port = 888
`);

require('./lib/logit.js')


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Get standard header
//---------------------------------------------------------------------------
function get_header() {

  return new Promise((result, reject) => {
    fs.readFile('html/header.html', 'utf8', (err, data) => {
      if (err) {
        logger.error(err)
        reject(err)
      } else {
        result(data)
      }
    })
  })
}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//top 10 played tracks from tx3
//---------------------------------------------------------------------------
function top_10_tx3(db) {
  html = ''

  logger.verbose(ln()+"In top_10_tx3")

  sql = "select songID, title, artist, year, count(*) count from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and user='tx3' and active and song_type=0 group by songID order by count desc limit 20;"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {
html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<div class="divTable blueTable"> 
<div class="divTableHeading">
<div class="divTableRow">`

        cols.forEach((d) => {
          html = html + '<div class="divTableHead">' + d.name + '</div>'
        })
        html += '</div></div>'
        html += `<div class="divTableBody">`

        Object.keys(rows).forEach((key) => {
          row = rows[key]
          html += `<div class="divTableRow">
<div class="divTableCell">${row.songID}</div>
<div class="divTableCell">${row.title}</div>
<div class="divTableCell">${row.artist}</div>
<div class="divTableCell">${row.year}</div>
<div class="divTableCell">${row.count}</div>
</div>`

        })
        result(html)
      }
    });
  });

}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Number tracks plays in each decade
//---------------------------------------------------------------------------
function decade(db) {
sql = "select concat(left(year,3),'0') 'Decade', count(*) count from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and user!='tx3' and active and song_type=0 group by left(year,3) order by count desc"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {
html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<div class="divTable blueTable">
<div class="divTableHeading">
<div class="divTableRow">`

cols.forEach((d) => {
  html = html + '<div class="divTableHead">' + d.name + '</div>'
})
  html += '</div></div>'
html += `<div class="divTableBody">`

Object.keys(rows).forEach((key) => {
  row = rows[key]
  html += `<div class="divTableRow">
<div class="divTableCell">${row.Decade}</div>
<div class="divTableCell">${row.count}</div>
</div>`

})
        result(html)
      }
    });
  });

}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Top tracks from everywhere
//---------------------------------------------------------------------------
function top_tracks(db) {

  sql = "select songID, title, artist, year, count(*) count from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and active and song_type=0 group by songID order by count desc limit 20"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<div class="divTable blueTable">
<div class="divTableHeading">
<div class="divTableRow">`

cols.forEach((d) => {
  html = html + '<div class="divTableHead">' + d.name + '</div>'
})
  html += '</div></div>'
html += `<div class="divTableBody">`

Object.keys(rows).forEach((key) => {
  row = rows[key]
  html += `<div class="divTableRow">
<div class="divTableCell">${row.songID}</div>
<div class="divTableCell">${row.artist}</div>
<div class="divTableCell">${row.title}</div>
<div class="divTableCell">${row.year}</div>
<div class="divTableCell" align="center">${row.count}</div>
</div>`

})
        result(html)
      }
    });
  });
}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//MAIN main Main
//---------------------------------------------------------------------------

cli_args
  .option('--log-to-screen', 'Log output to console')
  .option('--log-file <name>', 'Log filname and path', config.get("report.log_file"))
  .addOption(new cli_args.Option('--log-level <type>', 'Set logging level', 'error').choices(['error', 'verbose', 'info']));

cli_args.parse(process.argv);

logger = create_logger(cli_args);
logger.info(ln()+"Hello World!!")

const db = mysql.createConnection({
  host : config.get("sql.host"),
  user : config.get("sql.username"),
  password : config.get("sql.password"),
  database : config.get("sql.database"),
})

db.connect((err) => {
  if (err) {
    throw(err);
  }
});

fastify.get('/top_10_tx3', (request, reply) => {
  get_header()
  .catch(reject => {
    throw(reject);
  })
  .then(result => {
    header = result
    top_10_tx3(db)
    .catch(reject => {
      throw(reject);
    })
    .then(result => {
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .send(header+result)
    })
  })
})

fastify.get('/decade', (request, reply) => {
  get_header()
  .catch(reject => {
    throw(reject);
  })
  .then(result => {
    header = result
    decade(db)
    .catch(reject => {
      throw(reject);
    })
    .then(result => {
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .send(header+result)
    })
  })
})

fastify.get('/top_tracks', (request, reply) => {
  get_header()
  .catch(reject => {
    throw(reject);
  })
  .then(result => {
    header = result
    top_tracks(db)
    .catch(reject => {
      throw(reject);
    })
    .then(result => {
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .send(header+result)
    })
  })
})

fastify.get('/*', (request, reply) => {
  get_header()
  .catch(reject => {
    throw(reject);
  })
  .then(result => {
    header = result
    reply
      .code(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(header)
  })
})

//app.listen({port: config.get("report.port"), host: config.get("report.listen_host")}, () => {
//  logger.info(ln()+"Server is up on port " + config.get("report.port"));
//});

//+
//Run the server
//-
fastify.listen(config.get("report.port"), config.get("report.listen_host"), (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  logger.info(ln()+"Server is up on port " + config.get("report.port"));
})

