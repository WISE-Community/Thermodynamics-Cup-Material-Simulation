let temperatures = ['Hot', 'Warm', 'Cold'];
let materials = ['Styrofoam', 'Wood', 'Clay', 'Plastic', 'Glass', 'Aluminum'];

var chart = null;
var categories = [];
var series = [];

function init() {
  //renderChart(categories, series);
}

function renderChart(categories, series, lowerRangePoint, upperRangePoint) {
  let title = 'Total change in temperature (Celsius) from ' + lowerRangePoint + ' min to ' + upperRangePoint + ' min';
  let alternateGridColor = null;
  if (categories.length > 1) {
    alternateGridColor = '#F7F7F7';
  }
  chart = new Highcharts.chart('container', {
      chart: {
          type: 'column',
          animation: false
      },
      plotOptions: {
          series: {
              animation: false
          }
      },
      title: {
          text: title
      },
      xAxis: {
          categories: categories,
          alternateGridColor: alternateGridColor
      },
      yAxis: {
          min: -60,
          max: 30,
          title: {
              text: 'Change in Temperature (Celsius)'
          }
      },
      credits: {
          enabled: false
      },
      series: series
  });
}

function sortTemperatures(tempA, tempB) {
  let tempAIndex = temperatures.indexOf(tempA);
  let tempBIndex = temperatures.indexOf(tempB);
  if (tempAIndex < tempBIndex) {
    return -1;
  } else if (tempAIndex > tempBIndex) {
    return 1;
  } else {
    return 0;
  }
}

function sortMaterials(materialA, materialB) {
  let materialAIndex = materials.indexOf(materialA.name);
  let materialBIndex = materials.indexOf(materialB.name);

  if (materialAIndex < materialBIndex) {
    return -1;
  } else if (materialAIndex > materialBIndex) {
    return 1;
  } else {
    return 0;
  }
}

function handleConnectedComponentStudentDataChanged(componentState) {
  if (componentState.componentType == 'Graph') {
    //resetTable();
    const currentMouseOverPointXValue =
      getCurrentMouseOverPointXValue(componentState);

    // for (let trials of componentState.studentData.trials) {
    //   addTrialRowToTable(trials.series[0], currentMouseOverPointXValue);
    // }

    let chartData = generateChartData(componentState.studentData.trials, currentMouseOverPointXValue);
    categories = chartData.categories;
    series = chartData.series;
    lowerRangePoint = chartData.lowerRangePoint;
    upperRangePoint = chartData.upperRangePoint;

    categories = categories.sort(sortTemperatures);
    series = series.sort(sortMaterials);

    renderChart(categories, series, lowerRangePoint, upperRangePoint);
  }
}

function generateChartData(trials, x) {
  let categories = [];
  let series = [];
  let lowerRangePoint = 0;
  let upperRangePoint = 0;

  for (let trial of trials) {
    if (trial.show) {
      let trialId = trial.id;
      let material = getMaterialFromTrialId(trialId);
      let bevTemp = getBevTempFromTrialId(trialId);
      let range = getRangeClosestToMouseOverPoint(trial.series[0].data, x);
      let lowerRangePointObject = range[0];
      let upperRangePointObject = range[1];
      let changeInTemperature = upperRangePointObject.y - lowerRangePointObject.y;
      let color = trial.series[0].color;

      addCategory(categories, bevTemp);
      addSeries(series, material);
      let singleSeries = getSeriesByName(series, material);
      setSeriesValue(singleSeries, bevTemp, changeInTemperature);
      setSeriesColor(singleSeries, color);

      lowerRangePoint = lowerRangePointObject.x;
      upperRangePoint = upperRangePointObject.x;
    }
  }

  filterTemperatures(categories, series);


  return {
    categories: categories,
    series: series,
    lowerRangePoint: lowerRangePoint,
    upperRangePoint: upperRangePoint
  }
}


function filterTemperatures(categories, series) {
  let hasHot = false;
  let hasWarm = false;
  let hasCold = false;
  for (let singleSeries of series) {
    if (singleSeries.data[0] != null) {
      hasHot = true;
    }
    if (singleSeries.data[1] != null) {
      hasWarm = true;
    }
    if (singleSeries.data[2] != null) {
      hasCold = true;
    }
  }

  for (let singleSeries of series) {
    if (!hasCold) {
      singleSeries.data.splice(2, 1);
    }
    if (!hasWarm) {
      singleSeries.data.splice(1, 1);
    }
    if (!hasHot) {
      singleSeries.data.splice(0, 1);
    }
  }

  // if (!hasCold) {
  //   categories.splice(2, 1);
  // }
  // if (!hasWarm) {
  //   categories.splice(1, 1);
  // }
  // if (!hasHot) {
  //   categories.splice(0, 1);
  // }
}

function addCategory(categories, category) {
  if (!categories.includes(category)) {
    categories.push(category);
  }
}

function addSeries(series, seriesName) {
  for (let singleSeries of series) {
    if (singleSeries.name == seriesName) {
      return;
    }
  }

  series.push({ name: seriesName, data: [null, null, null] });
}

function setSeriesValue(series, category, value) {
  if (category == 'Hot') {
    series.data[0] = value;
  } else if (category == 'Warm') {
    series.data[1] = value;
  } else if (category == 'Cold') {
    series.data[2] = value;
  }
}

function setSeriesColor(series, color) {
  series.color = color;
}

function getSeriesByName(series, seriesName) {
  for (let singleSeries of series) {
    if (singleSeries.name == seriesName) {
      return singleSeries;
    }
  }
  return null;
}

function getMaterialFromTrialId(trialId) {
  let regEx = /(.*)-(.*)Liquid/;
  let match = regEx.exec(trialId);
  let material = match[1];
  return material;
}

function getBevTempFromTrialId(trialId) {
  let regEx = /(.*)-(.*)Liquid/;
  let match = regEx.exec(trialId);
  let bevTemp = match[2];
  return bevTemp;
}

function resetTable() {
  $("#tempChangeTable").empty();
  $("#tempChangeTable").append(`<tr><th>Trial ID</th><th>Lower X</th>
      <th>Upper X</th><th>Change in temperature °C</th><tr/>`);
}

function addTrialRowToTable(series, currentMouseOverPointXValue) {
  const range = getRangeClosestToMouseOverPoint(series.data,
      currentMouseOverPointXValue);
  const lowerRangePoint = range[0];
  const upperRangePoint = range[1];
  //const changeInTemperature = upperRangePoint[1] - lowerRangePoint[1];
  const changeInTemperature = upperRangePoint.y - lowerRangePoint.y;
  const changeInTemperatureDesc =
      getChangeInTemperatureDescription(changeInTemperature);
  const seriesRow = $(`<tr id="${series.name}">`);
  seriesRow.append(`<td class="seriesName">${series.name}</td>
      <td class="lowerY">${lowerRangePoint.x}</td>
      <td class="upperY">${upperRangePoint.x}</td>
      <td class="changeInTemperature">
          ${changeInTemperature.toFixed(2)} (${changeInTemperatureDesc})
      </td>`);
  $("#tempChangeTable").append(seriesRow);
}

function getRangeClosestToMouseOverPoint(seriesData, currentMouseOverPointXValue) {
  let lowerDataPoint = seriesData[0];
  let upperDataPoint = seriesData[0];
  let previousUpperDataPoint = seriesData[0];

  for (let x = 0; x < seriesData.length; x++) {
    upperDataPoint = seriesData[x];
    if (currentMouseOverPointXValue <= upperDataPoint.x) {
      upperDataPoint = previousUpperDataPoint;
      break;
    } else {
      previousUpperDataPoint = upperDataPoint;
    }
  }
  return [lowerDataPoint, upperDataPoint];
}

function getCurrentMouseOverPointXValue(componentState) {
  let mouseOverPointXValue = 0;
  if (componentState.studentData.mouseOverPoints != null &&
      componentState.studentData.mouseOverPoints.length > 0) {
    let mouseOverPoints = componentState.studentData.mouseOverPoints;
    mouseOverPointXValue = mouseOverPoints[mouseOverPoints.length - 1][0];
  }
  return mouseOverPointXValue;
}

function getChangeInTemperatureDescription(changeInTemperature) {
  if (changeInTemperature < 0) {
    return "cooling";
  } else if (changeInTemperature > 0) {
    return "heating";
  } else {
    return "same";
  }
}

function receiveMessage(message) {
  if (message != null) {
    let messageData = message.data;
    if (messageData != null) {
      if (messageData.messageType == 'handleConnectedComponentStudentDataChanged') {
        handleConnectedComponentStudentDataChanged(messageData.componentState);
      }
    }
  }
}

window.addEventListener('message', receiveMessage);
