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
// Turn songID into a clicky link
//---------------------------------------------------------------------------
function song_id_2_html(song_id) {

  return `<div class="divTableCell">
<form target="_blank" action="http://nostromo/cgi/songs.php" method="post">
<button type="submit" name="song_id" class="btn-link" value="${song_id}">
<input type="hidden" name="and_or" value="or">
<input type="hidden" name="ACTION" value="search">
<input type="hidden" name="search_for_title" value="">
<input type="hidden" name="search_for_artist" value="">${song_id}
</button>
</form>
</div>`
}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Turn artists into a clicky link
//---------------------------------------------------------------------------
function artist_2_html(artist) {

  return `<div class="divTableCell">
<form target="_blank" action="http://nostromo/cgi/songs.php" method="post">
<button type="submit" name="search_for_artist" class="btn-link" value="${artist}">
<input type="hidden" name="and_or" value="or">
<input type="hidden" name="ACTION" value="search">
<input type="hidden" name="search_for_title" value="">
<input type="hidden" name="song_id" value="">
${artist}
</button>
</form>
</div>`
}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//top 10 played tracks from tx3
//---------------------------------------------------------------------------
function top_10_tx3(db) {
  html = ''

  logger.verbose(ln()+"In top_10_tx3")

  sql = "select songID, artist, title, year, count(*) count from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and user='tx3' and active and song_type=0 group by songID order by count desc limit 20;"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {
html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<h2>Top TX3 tracks in last 7 days</h2>
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
          html += `<div class="divTableRow">`
          html += song_id_2_html(row.songID)
          html += artist_2_html(row.artist)
          html += `<div class="divTableCell">${row.title}</div>
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
// Tracks we don't play for various reasons
//---------------------------------------------------------------------------
function non_players(db) {
logger.verbose(ln()+"In top_10_tx3")

  sql = `select "disabled" reason, id, artist, title, "" date from songs where enabled != 1
union
select "end dated", id, artist, title, end_date from songs where end_date > now()
union
select "start dated", id, artist, title,start_date from songs where start_date > now()
union
select "Retired", id, s.artist, s.title, se.retire_until from songs s, songs_extra se where s.id = se.song_id and se.retire_until > now()`

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {
        html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<h2>Non played tracks</h2>
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
<div class="divTableCell">${row.reason}</div>`
          html += song_id_2_html(row.id)
          html += artist_2_html(row.artist)
          html += `<div class="divTableCell">${row.title}</div>
<div class="divTableCell">${row.date}</div>
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
<h2>Number of tracks by Decade</h2>
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

  sql = "select songID, artist, title, year, count(*) count from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and active and song_type=0 group by songID order by count desc limit 20"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows, cols) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {html = `<div class="bigbox fixed">
<div id="main_inner" class="fixed">
<div class='post' align='center'>
<h2>Top tracks played in last 7 days</h2>
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
        html += `<div class="divTableRow">`
        html += song_id_2_html(row.songID)
        html += artist_2_html(row.artist)
        html += `<div class="divTableCell">${row.title}</div>
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

fastify.get('/non_players', (request, reply) => {
  get_header()
  .catch(reject => {
    throw(reject);
  })
  .then(result => {
    header = result
    non_players(db)
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

