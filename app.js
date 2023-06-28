const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started in port:3000");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
  }
};

initializeDatabaseAndServer();

const convertAllStateCaseToCamelcase = (db) => {
  return {
    stateId: db.state_id,
    stateName: db.state_name,
    population: db.population,
  };
};
//get all states
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `SELECT * FROM state;`;
  const statesArray = await db.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) => convertAllStateCaseToCamelcase(eachState))
  );
});

// get state by id
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getAllStatesQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getAllStatesQuery);
  response.send(convertAllStateCaseToCamelcase(state));
});

// create a district
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO
      district ( district_name,
                state_id,
                cases,
                cured,
                active,
                deaths)
    VALUES
        (   '${districtName}',
            '${stateId}',
            '${cases}',
            '${cured}',
            '${active}',
            '${deaths}'  );`;
  const dbResponse = await db.run(addDistrictQuery);

  response.send("District Successfully Added");
});

const convertDistrictCaseToCamelcase = (db) => {
  return {
    districtId: db.district_id,
    districtName: db.district_name,
    stateId: db.state_id,
    cases: db.cases,
    cured: db.cured,
    active: db.active,
    deaths: db.deaths,
  };
};
// get district by id
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = '${districtId}';`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictCaseToCamelcase(district));
});

// delete district
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = '${districtId}';`;
  await db.get(deleteDistrictQuery);
  response.send("District Removed");
});

// update district
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
  UPDATE 
    district 
  SET
    district_name = '${districtName}',
    state_id ='${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
  WHERE district_id = '${districtId}';`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});


// get state covid stats
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getAllStatesQuery = `
  SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
  FROM 
    district 
    WHERE 
    state_id = ${stateId};`;
  const stats = await db.get(getAllStatesQuery);
  console.log(stats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// get district stats 
app.get('/districts/:districtId/details/', async (request, response) => {
    const { districtId } = request.params;
    const getDistrictIdQuery = `SELECT state_id FROM district 
    WHERE district_id = '${districtId}'; `;
    const getDistQueryResponse = await db.get(getDistrictIdQuery);

    const getStatenameQuery = `SELECT state_name as stateName FROM state
    WHERE state_id = ${getDistQueryResponse.state_id};`

    const getStatenameResponse = await db.get(getStatenameQuery);
    response.send(getStatenameResponse);
})


module.exports = app;