const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseStateObject = (stateObject) => {
  return {
    stateId: stateObject.state_id,
    stateName: stateObject.state_name,
    population: stateObject.population,
  };
};
const convertDbObjectToResponseDistrictObject = (districtObject) => {
  return {
    districtId: districtObject.district_id,
    districtName: districtObject.district_name,
    stateId: districtObject.state_id,
    cases: districtObject.cases,
    cured: districtObject.cured,
    active: districtObject.active,
    deaths: districtObject.deaths,
  };
};

//get data from states API
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
    ORDER BY
      state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachPlayer) =>
      convertDbObjectToResponseStateObject(eachPlayer)
    )
  );
});

//get data from state only single data
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
    where
      state_id =${stateId};`;
  const statesArray = await db.get(getStatesQuery);
  response.send(convertDbObjectToResponseStateObject(statesArray));
});

//post data into district table

app.post("/districts/", async (request, response) => {
  const covidDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = covidDetails;
  const addDistrictQuery = `
    INSERT INTO
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
        '${districtName}',
         ${stateId},
         '${cases}',
         '${cured}',
         '${active}',
         '${deaths}'
      );`;
  const dbResponse = await db.run(addDistrictQuery);
  const DistrictId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//get data from district table
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getdistrictQuery = `
    SELECT
      *
    FROM
      district
    where
      district_id =${districtId};`;
  const districtArray = await db.get(getdistrictQuery);

  response.send(convertDbObjectToResponseDistrictObject(districtArray));
});

//delete API from Districts table

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const deleteDistrictQuery = `
    DELETE FROM
        district
    WHERE
        district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//update data in the district table

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

  const updateDistrictQuery = `UPDATE
        district
      SET
        district_name = '${districtName}', /*player_name is the correct column name*/
        state_id = ${stateId}, /*jersey_number is the correct column name*/
        cases = '${cases}',
        cured='${cured}',
        active ='${active}',
        deaths='${deaths}'
      WHERE
        district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateIdQuery = `select SUM(cases) as totalCases, SUM(cured) as totalCured,
    SUM(active) as totalActive , SUM(deaths) as totalDeaths from district where state_id = ${stateId};`;
  const getStateByIDStatsQueryResponse = await db.get(getStateIdQuery);
  response.send(getStateByIDStatsQueryResponse);
});

//Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    `; //With this we will get the state_id using district table
  const getDistrictIdQueryRes = await db.get(getDistrictIdQuery);
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryRes.state_id};
    `; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryRes = await db.get(getStateNameQuery);
  response.send(getStateNameQueryRes);
});
module.exports = app;
