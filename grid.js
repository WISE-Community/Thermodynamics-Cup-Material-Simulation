let grids;
let temperatures = ['Hot', 'Warm', 'Cold'];
let materials = ['Aluminum', 'Wood', 'Styrofoam', 'Clay', 'Glass', 'Plastic'];

function init() {
  if (isCollectMode()) {
    grids = new CollectionGrids();
  } else if (isFlagMode()) {
    grids = new FlagGrids();
    if (isAutoScoreMaterialMode() || isAutoScoreTemperatureMode()) {
      displayAutoScoreMode();
    }
  } else if (isInterpretMode()) {
    grids = new InterpretGrids();
  } else {
    alert("Error: unrecognized mode. Exiting.");
    return;
  }
  showOnlyAvailableTemps();
  initCellClickedHandlers();
  grids.sendGetParametersMessage();
  grids.sendGetLatestAnnotationsMessage();
}

function showOnlyAvailableTemps() {
  const allAvailableTemps = getAllAvailableTemps();
  temperatures.map((temp) => {
    if (!allAvailableTemps.includes(temp)) {
      $(`.Temp.${temp}`).hide();
    }
  });
}

function initCellClickedHandlers() {
  $(".choice").click(function(event, ui) {
    grids.cellClicked($(this));
  });

  if (isInterpretMode()) {
    $(".choice").addClass("disabled");
  }
}

class Grids extends WISEAPI {
  constructor() {
    super();
    this.completedCells = [];
    this.flaggedCells = [];
    this.selectedCells = [];
  }

  loadComponentState(componentState) {
    let studentData = componentState.studentData;
    if (studentData.completedCells != null) {
      this.completedCells = studentData.completedCells;
    }
    if (studentData.flaggedCells != null) {
      this.flaggedCells = studentData.flaggedCells;
    }
    if (studentData.selectedCells != null) {
      this.selectedCells = studentData.selectedCells;
    }
    this.refreshCells();
  }

  highlightSelectedCells() {
    $(".choice").removeClass("selected");
    for (const selectedCell of this.selectedCells) {
      this.highlightCell(selectedCell);
    }
  }

  refreshCells() {
    this.highlightSelectedCells();
    this.showCheckOnCells();
    this.showFlaggedCells();
    this.showCellOrders();
  }

  showCheckOnCells() {
    for (const cell of this.completedCells) {
      this.showCheckOnCell(cell.material, cell.bevTemp, cell.airTemp);
    }
  }

  showFlaggedCells() {
    $(".choice").removeClass("flagged");
    for (const flaggedCell of this.flaggedCells) {
      this.flagCell(flaggedCell);
    }
  }

  showCellOrders() {
    for (let c = 0; c < this.completedCells.length; c++) {
      const cell = this.completedCells[c];
      this.showOrderNumberOnCell(cell.material, cell.bevTemp, cell.airTemp, c + 1);
    }
  }

  getCellDOM(material, bevTemp, airTemp) {
    return $('td[material="' + material + '"][bevTemp="' + bevTemp + '"][airTemp="' + airTemp + '"]');
  }

  createCell(material, bevTemp, airTemp) {
    return {
      material: material,
      bevTemp: bevTemp,
      airTemp: airTemp,
      dateAdded: Date.now()
    }
  }

  addCompletedCell(material, bevTemp, airTemp) {
    if (!this.isCellCompleted(material, bevTemp, airTemp)) {
      this.completedCells.push(this.createCell(material, bevTemp, airTemp));
    }
  }

  isCellCompleted(material, bevTemp, airTemp) {
    for (const completedCell of this.completedCells) {
      if (this.cellAttributesMatch(completedCell, material, bevTemp, airTemp)) {
        return true;
      }
    }
    return false;
  }

  addSelectedCell(material, bevTemp, airTemp) {
    this.selectedCells.push(this.createCell(material, bevTemp, airTemp));
  }

  isCellSelected(material, bevTemp, airTemp) {
    for (const selectedCell of this.selectedCells) {
      if (this.cellAttributesMatch(selectedCell, material, bevTemp, airTemp)) {
        return true;
      }
    }
    return false;
  }

  removeSelectedCell(material, bevTemp, airTemp) {
    for (let c = 0; c < this.selectedCells.length; c++) {
      const selectedCell = this.selectedCells[c];
      if (this.cellAttributesMatch(selectedCell, material, bevTemp, airTemp)) {
        this.selectedCells.splice(c, 1);
        c--;
      }
    }
  }

  clearSelectedCells() {
    this.selectedCells = [];
  }

  cellAttributesMatch(cell, material, bevTemp, airTemp) {
    return cell.material == material && cell.bevTemp == bevTemp && cell.airTemp == airTemp;
  }

  cellClicked(cellDOMElement) {
    // overridden by children
  }

  highlightCell(cell) {
    this.getCellDOM(cell.material, cell.bevTemp, cell.airTemp)
        .addClass("selected");
  }

  flagCell(cell) {
    this.getCellDOM(cell.material, cell.bevTemp, cell.airTemp)
        .addClass("flagged");
  }

  showCheckOnCell(material, bevTemp, airTemp) {
    this.getCellDOM(material, bevTemp, airTemp)
        .addClass("completed")
        .removeClass("unexplored")
        .removeClass("disabled");
  }

  showOrderNumberOnCell(material, bevTemp, airTemp , order) {
    this.getCellDOM(material, bevTemp, airTemp).html(order);
  }

  trialCompleted(componentState) {
    const material = componentState.studentData.materialText;
    const bevTemp = componentState.studentData.bevTempText;
    const airTemp = componentState.studentData.airTempText;
    this.addCompletedCell(material, bevTemp, airTemp);
    this.showCheckOnCells();
    this.showCellOrders();
    this.saveToWISE();
  }

  receivedGetParametersMessage(parameters) {
    this.nodeId = parameters.nodeId;
    this.componentId = parameters.componentId;
  }

  handleComponentStateMessage(messageData) {
    const componentState = messageData.componentState;
    if (componentState != null) {
      this.loadComponentState(componentState);
    }
  }

  handleLatestAnnotationsMessage(messageData) {
    const latestScoreAnnotation = messageData.latestScoreAnnotation;
    const latestCommentAnnotation = messageData.latestCommentAnnotation;
    if (getMaxNumAutoScoreAttempts() === 1 && latestCommentAnnotation != null) {
      this.disableFeedbackButton();
    }
  }

  handleConnectedComponentStudentDataChangedMessage(messageData) {
    const componentState = messageData.componentState;
    if (componentState.componentType == 'Graph') {
      showModelStateFromGraphStudentWork(componentState);
    } else if (componentState.componentType == 'Embedded' &&
        componentState.studentData.isTrialCompleted) {
      this.trialCompleted(componentState);
    }
  }

  getStudentDataToSave() {
    return {
      completedCells: this.completedCells,
      flaggedCells: this.flaggedCells,
      selectedCells: this.selectedCells
    };
  }

  saveFeedbackToWISE(feedback = '') {
    const studentData = this.getStudentDataToSave();
    const componentState = this.createComponentState(studentData, 'studentWork');
    const annotation = this.createAnnotation('autoComment', feedback);
    this.addAnnotationToComponentState(componentState, annotation);
    try {
      this.sendMessageToParent(componentState);
    } catch(err) {
      console.log("not posted");
    }
  }

  saveToWISE() {
    const studentData = this.getStudentDataToSave();
    const componentState = this.createComponentState(studentData, 'studentDataChanged');
    try {
      this.sendMessageToParent(componentState);
    } catch(err) {
      console.log("not posted");
    }
  }

  feedback(feedback) {
    this.saveFeedbackToWISE(feedback);
    $("#log").append(feedback);
    $("#log").append("<br/>");
    $("#log").append("<br/>");
  }

  threePartFeedback(summary, questions, budgetCheck) {
    const feedback = `<b>What your plan indicates:</b> ${summary}<br/><br/>
        <b>Questions to help improve your plan:</b> ${questions}<br/><br/>
        <b>Budget check:</b> ${budgetCheck}<br/>`;
    this.saveFeedbackToWISE(feedback);
    $("#log").append(feedback);

  }

  showFeedbackCase(feedbackCase) {
    this.appendLog(`[Case ${feedbackCase}]`);
    this.appendLog(`<br/>`);
  }

  appendLog(message) {
    $("#log").append(message);
  }

  giveFeedback() {
    let calculateFeedback = true;
    if (getMaxNumAutoScoreAttempts() === 1) {
      calculateFeedback = confirm("You only have one attempt to receive feedback, are you sure you're ready to receive feedback?");
    }

    if (calculateFeedback) {
      const aggregate = this.getFlaggedCellsAggregate();
      if (this.noCellSelected(aggregate)) {
        this.feedback("[Condition NoneSelected] Please choose experiment(s) that you want to run.");
        return;
      }

      if (this.onlyHot(aggregate) || this.onlyCold(aggregate)) {
        this.giveFeedbackOnlyHotOrOnlyCold(aggregate);
      } else if (this.noPairs(aggregate) || this.onlyPairs(aggregate)) {
        this.giveFeedbackNoPairsOrOnlyPairs(aggregate);
      } else if (this.numPairs(aggregate) === (this.numHotOnly(aggregate) + this.numColdOnly(aggregate))) {
        this.showFeedbackCase(`2D`);
        this.getFeedbackNumPairsEqualsSingles(aggregate);
      } else if (this.numPairs(aggregate) !== (this.numHotOnly(aggregate) + this.numColdOnly(aggregate))) {
        this.showFeedbackCase(`2E`);
        this.getFeedbackNumPairsNotEqualsSingles(aggregate);
      }

      if (getMaxNumAutoScoreAttempts() === 1) {
        this.disableFeedbackButton();
      }
    }
  }

  disableFeedbackButton() {
    $("#feedbackButton").prop('disabled', true);
    $("#feedbackButton").css('background-color', 'grey');
    $("#feedbackButton").css('cursor', 'auto');
  }

  giveFeedbackOnlyHotOrOnlyCold(aggregate) {
    const allMaterialsFlagged = this.getAllMaterialsFlagged(aggregate);
    const moreSelectedTemp = this.onlyHot(aggregate) ? 'hot' : 'cold';
    const summary = `It seems you want to investigate materials for a ${moreSelectedTemp} beverage because your plan includes only ${moreSelectedTemp} tests.
        You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
    let questions = `Does running only ${moreSelectedTemp} tests give you the evidence you need to decide on the best material?`;
    const numMaterials = this.getNumMaterials(aggregate);
    if (numMaterials === 1) {
      this.showFeedbackCase(`1A`);
      questions = `Does running only one test with one material and one temperature give you enough evidence to compare and decide on the best material?
            Based on what you know about the six materials, are there any additional tests it would be helpful to add?`;
    } else if (numMaterials <= 2) {
      this.showFeedbackCase(`1A`);
      questions = `${questions} Based on what you know about the six materials, are there any additional
            tests it would be helpful to add? `;
    } else if (numMaterials <= 4) {
      this.showFeedbackCase(`1B`);
      questions = `${questions} Based on what you know about the six materials, are there any tests you should
            add or eliminate from your plan? `;
    } else {
      this.showFeedbackCase(`1C`);
      questions = `${questions} Based on what you know about the six materials, are there any tests you can
            eliminate from your plan? `;
    }
    const budgetCheck = this.getFeedbackBudgeCheck(aggregate);
    this.threePartFeedback(summary, questions, budgetCheck);
  }

  giveFeedbackNoPairsOrOnlyPairs(aggregate) {
    const summary = this.getSummaryForNoPairsOrOnlyPairs(aggregate);
    const numMaterials = this.getNumMaterials(aggregate);
    const questions = this.getQuestionsForPairsOrNoPairs(numMaterials);
    const budgetCheck = this.getFeedbackBudgeCheck(aggregate);
    this.threePartFeedback(summary, questions, budgetCheck);
  }

  getFeedbackNumPairsEqualsSingles(aggregate) {
    const allMaterialsFlagged = this.getAllMaterialsFlagged(aggregate);
    let summary;
    let questions;
    if (this.numColdOnly(aggregate) === this.numHotOnly(aggregate)) {
      summary = `It seems you are undecided between or want to investigate both temperature beverages because your plan includes an equal number of hot and cold tests.
          You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
      questions = `Does running a combination of cold and hot tests help you to decide on the best material?`;
    } else {
      const moreSelectedTemp = this.numColdOnly(aggregate) > this.numHotOnly(aggregate) ? 'cold' : 'hot';
      summary = `It seems you want to investigate materials for a ${moreSelectedTemp} beverage because your plan includes more ${moreSelectedTemp} tests.
        You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
      questions = `Does running more ${moreSelectedTemp} tests give the evidence you need to decide on the best material?`;
    }
    const numMaterials = this.getNumMaterials(aggregate);
    if (numMaterials <= 2) {
      questions = `${questions} Based on what you know about the six materials, are there any additional
            tests it would be helpful to add?`;
    } else if (numMaterials <= 4) {
      questions = `${questions} Based on what you know about the six materials, are there any tests you should
            add or eliminate from your plan?`;
    } else {
      questions = `${questions} Based on what you know about the six materials, are there any tests you can
            eliminate from your plan?`;
    }
    const budgetCheck = this.getFeedbackBudgeCheck(aggregate);
    this.threePartFeedback(summary, questions, budgetCheck);
  }

  getFeedbackNumPairsNotEqualsSingles(aggregate) {
    this.getFeedbackNumPairsEqualsSingles(aggregate);
  }

  getSummaryForNoPairsOrOnlyPairs(aggregate) {
    const allMaterialsFlagged = this.getAllMaterialsFlagged(aggregate);
    let summary;
    if (this.noPairs(aggregate)) {
      if (this.numColdOnly(aggregate) === this.numHotOnly(aggregate)) {
        this.showFeedbackCase(`2A`);
        summary = `It seems you are undecided between or want to investigate both temperature beverages because your plan includes an equal number of both hot and cold tests.
          You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
      } else {
        this.showFeedbackCase(`2B`);
        const moreSelectedTemp = this.numColdOnly(aggregate) > this.numHotOnly(aggregate) ? 'cold' : 'hot';
        const lessSelectedTemp = this.numColdOnly(aggregate) < this.numHotOnly(aggregate) ? 'cold' : 'hot';
        summary = `It seems you want to investigate materials for a ${moreSelectedTemp} beverage because your plan includes more ${moreSelectedTemp} tests than ${lessSelectedTemp} tests.
          You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
      }
    } else if (this.onlyPairs(aggregate)) {
      this.showFeedbackCase(`2C`);
      summary = `It seems you are undecided between or want to investigate both temperature beverages because your plan includes an equal number of both hot and cold tests.
        You want to compare ${allMaterialsFlagged.length} material(s): ${allMaterialsFlagged.join(", ")}.`;
    }
    return summary;
  }

  getQuestionsForPairsOrNoPairs(numMaterials) {
    let questions = `Does running a combination of cold and hot tests help you to decide on the best material?`;
    if (numMaterials <= 2) {
      questions = `${questions} Based on what you know about the six materials, are there any additional
            tests it would be helpful to add? `;
    } else if (numMaterials <= 4) {
      questions = `${questions} Based on what you know about the six materials, are there any tests you should
            add or eliminate from your plan?`;
    } else {
      questions = `${questions} Based on what you know about the six materials, are there any tests you can
            eliminate from your plan?`;
    }
    return questions;
  }

  getFeedbackBudgeCheck() {
    const numTests = this.numTests();
    return `Your plan uses ${numTests} out of the 12 possible tests (${Math.round(numTests / 12 * 100)}% of your budget).
          Remember, your goal is to gather enough evidence to recommend a material using as little of your budget
          as you can.`
  }

  getFlaggedCellsAggregate() {
    const flaggedCellsByMaterial = {};
    const flaggedCellsHotAndCold = [];
    const flaggedCellsHotOnly = [];
    const flaggedCellsColdOnly = [];
    ["Aluminum", "Wood", "Styrofoam", "Clay", "Glass", "Plastic"].map((material) => {
      flaggedCellsByMaterial[material] = this.getFlaggedCellsByMaterial(material);
      const hotMaterial = this.getFlaggedCellsByMaterialAndTemp(material, "Hot");
      const coldMaterial = this.getFlaggedCellsByMaterialAndTemp(material, "Cold");
      if (hotMaterial.length === 1 && coldMaterial.length === 1) {
        flaggedCellsHotAndCold.push(material);
      } else if (hotMaterial.length === 1) {
        flaggedCellsHotOnly.push(material);
      } else if (coldMaterial.length === 1) {
        flaggedCellsColdOnly.push(material);
      }
    });
    const flaggedCellsByTemp = {};
    ["Hot", "Cold"].map((temp) => {
      flaggedCellsByTemp[temp] = this.getFlaggedCellsByTemp(temp);
    });
    return {
      byMaterial: flaggedCellsByMaterial,
      byTemp: flaggedCellsByTemp,
      hotAndCold: flaggedCellsHotAndCold,
      hotOnly: flaggedCellsHotOnly,
      coldOnly: flaggedCellsColdOnly
    };
  }

  noCellSelected(aggregate) {
    return this.numHotOnly(aggregate) === 0 &&
        this.numColdOnly(aggregate) === 0 &&
        this.numPairs(aggregate) === 0;
  }

  noPairs(aggregate) {
    return this.numPairs(aggregate) === 0 &&
        (this.numHotOnly(aggregate) > 0 || this.numColdOnly(aggregate) > 0);
  }

  getAllMaterialsFlagged(aggregate) {
    return aggregate.hotAndCold.concat(aggregate.hotOnly).concat(aggregate.coldOnly);
  }

  getNumMaterials(aggregate) {
    let numMaterials = 0;
    for (const material of materials) {
      if (this.getFlaggedCellsByMaterial(material).length > 0) {
        numMaterials++;
      }
    }
    return numMaterials;
  }

  onlyCold(aggregate) {
    return this.numColdOnly(aggregate)> 0 &&
        this.numHotOnly(aggregate) === 0 && this.numPairs(aggregate) === 0;
  }

  onlyHot(aggregate) {
    return this.numHotOnly(aggregate) > 0 &&
        this.numColdOnly(aggregate) === 0 && this.numPairs(aggregate) === 0;
  }

  onlyPairs(aggregate) {
    return this.numPairs(aggregate) > 0 &&
        this.numHotOnly(aggregate) === 0 && this.numColdOnly(aggregate)=== 0;
  }

  numPairs(aggregate) {
    return aggregate.hotAndCold.length;
  }

  numColdOnly(aggregate) {
    return aggregate.coldOnly.length;
  }

  numHotOnly(aggregate) {
    return aggregate.hotOnly.length;
  }

  numTests() {
    return this.flaggedCells.length;
  }

  getFlaggedCellsByMaterial(material) {
    return this.flaggedCells.filter((flaggedCell) => {
      return flaggedCell.material === material;
    });
  }

  getFlaggedCellsByTemp(temp) {
    return this.flaggedCells.filter((flaggedCell) => {
      return flaggedCell.bevTemp === temp;
    });
  }

  getFlaggedCellsByMaterialAndTemp(material, temp) {
    return this.flaggedCells.filter((flaggedCell) => {
      return flaggedCell.material === material && flaggedCell.bevTemp === temp;
    });
  }

  clearLog() {
    $("#log").html("");
  }
}

class FlagGrids extends Grids {
  constructor() {
    super();
  }

  cellClicked(cellDOMElement) {
    const material = cellDOMElement.attr("material");
    const bevTemp = cellDOMElement.attr("bevTemp");
    const airTemp = cellDOMElement.attr("airTemp");
    if (this.isCellFlagged(material, bevTemp, airTemp)) {
      this.removeFlaggedCell(material, bevTemp, airTemp);
    } else {
      this.addFlaggedCell(material, bevTemp, airTemp);
    }
    this.showFlaggedCells();
    this.saveToWISE();
  }

  addFlaggedCell(material, bevTemp, airTemp) {
    if (!this.isCellFlagged(material, bevTemp, airTemp)) {
      this.flaggedCells.push(this.createCell(material, bevTemp, airTemp));
    }
  }

  removeFlaggedCell(material, bevTemp, airTemp) {
    for (let c = 0; c < this.flaggedCells.length; c++) {
      const flaggedCell = this.flaggedCells[c];
      if (this.cellAttributesMatch(flaggedCell, material, bevTemp, airTemp)) {
        this.flaggedCells.splice(c, 1);
        c--;
      }
    }
  }

  isCellFlagged(material, bevTemp, airTemp) {
    for (const flaggedCells of this.flaggedCells) {
      if (this.cellAttributesMatch(flaggedCells, material, bevTemp, airTemp)) {
        return true;
      }
    }
    return false;
  }
}

class CollectionGrids extends Grids {
  constructor() {
    super();
    $(".choice").addClass("unexplored");
  }

  cellClicked(cellDOMElement) {
    let material = cellDOMElement.attr("material");
    let bevTemp = cellDOMElement.attr("bevTemp");
    let airTemp = cellDOMElement.attr("airTemp");

    this.setOneSelectedCell(material, bevTemp, airTemp);
    this.highlightSelectedCells();
    this.saveToWISE();
  }

  setOneSelectedCell(material, bevTemp, airTemp) {
    this.clearSelectedCells();
    this.addSelectedCell(material, bevTemp, airTemp);
  }
}

class InterpretGrids extends Grids {
  constructor() {
    super();
    $(".choice").addClass("unexplored");
  }

  cellClicked(cellDOMElement) {
    if (cellDOMElement.hasClass("disabled")) {
      alert("You haven't collected data for this trial!");
    } else {
      let material = cellDOMElement.attr("material");
      let bevTemp = cellDOMElement.attr("bevTemp");
      let airTemp = cellDOMElement.attr("airTemp");
      if (this.isCellSelected(material, bevTemp, airTemp)) {
        this.removeSelectedCell(material, bevTemp, airTemp);
      } else {
        this.addSelectedCell(material, bevTemp, airTemp);
      }
      this.highlightSelectedCells();
      this.saveToWISE();
    }
  }
}

function displayAutoScoreMode() {
  $("#autoScoreDiv").show();
  $("#autoScoreGuidanceHeading").append(` (${getAutoScoreMode()})`);
}
