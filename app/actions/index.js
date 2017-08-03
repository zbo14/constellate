'use strict';

const ADD_COLUMN = 'ADD_COLUMN';
const ADD_ROW = 'ADD_ROW';
const ADD_SHEET = 'ADD_SHEET';

const CHANGE_CELL = 'CHANGE_CELL';
const CHANGE_COLUMN = 'CHANGE_COLUMN';
const CHANGE_SUBJECT = 'CHANGE_SUBJECT';
const CHANGE_TITLE = 'CHANGE_TITLE';

const REMOVE_COLUMN = 'REMOVE_COLUMN';
const REMOVE_ROW = 'REMOVE_ROW';
const REMOVE_SHEET = 'REMOVE_SHEET';

const addColumn = sheet => {
  return {
    type: ADD_COLUMN,
    sheet
  }
}

const addRow = sheet => {
  return {
    type: ADD_ROW,
    sheet
  }
}

const addSheet = () => {
  return {
    type: ADD_SHEET
  }
}

const changeCell = (sheet, row, cell, val) => {
  return {
    type: CHANGE_CELL,
    sheet, row, cell, val
  }
}

const changeColumn = (sheet, col, val) => {
  return {
    type: CHANGE_COLUMN,
    sheet, col, val
  }
}

const changeTitle = title => {
  return {
    type: CHANGE_TITLE,
    title
  }
}

const changeSubject = (sheet, subject) => {
  return {
    type: CHANGE_SUBJECT,
    sheet, subject
  }
}

const removeColumn = (sheet, col) => {
  return {
    type: REMOVE_COLUMN,
    sheet, col
  }
}

const removeRow = (sheet, row) => {
  return {
    type: REMOVE_ROW,
    sheet, row
  }
}

const removeSheet = sheet => {
  return {
    type: REMOVE_SHEET,
    sheet
  }
}

module.exports = {
  ADD_COLUMN,
  ADD_ROW,
  ADD_SHEET,
  CHANGE_CELL,
  CHANGE_COLUMN,
  CHANGE_SUBJECT,
  CHANGE_TITLE,
  REMOVE_COLUMN,
  REMOVE_ROW,
  REMOVE_SHEET,
  addColumn,
  addRow,
  addSheet,
  changeCell,
  changeColumn,
  changeSubject,
  changeTitle,
  removeColumn,
  removeRow,
  removeSheet
}
