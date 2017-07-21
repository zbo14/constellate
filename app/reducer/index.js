'use strict';

const {
  ADD_COLUMN,
  ADD_ROW,
  ADD_SHEET,
  CHANGE_CELL,
  CHANGE_COLUMN,
  CHANGE_SUBJECT,
  CHANGE_TITLE,
  REMOVE_COLUMN,
  REMOVE_ROW,
  REMOVE_SHEET
} = require('../actions');

const {
  assign,
  newArray,
  splice
} = require('../../lib/util.js');

const addColumn = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const cols = sheet.cols.concat('');
  const rows = sheet.rows.map(r => r.concat(''));
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols, rows, subject: sheet.subject
    })
  });
}

const addRow = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const cols = sheet.cols;
  const rows = sheet.rows.concat([newArray('', cols.length)]);
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols, rows, subject: sheet.subject
    })
  });
}

const addSheet = (state, action) => {
  const sheets = state.sheets.concat({
    cols: [], rows: [], subject: ''
  })
  return assign(state, { sheets });
}

const changeCell = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const row = splice(sheet.rows[action.row], action.cell, 0, action.val);
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols: sheet.cols, subject: sheet.subject,
      rows: splice(sheet.rows, action.row, 0, row)
    })
  });
}

const changeColumn = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const cols = splice(sheet.cols, action.col, 0, action.val);
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols, rows: sheet.rows, subject: sheet.subject
    })
  });
}

const changeSubject = (state, action) => {
  const sheet = state.sheets[action.sheet];
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, assign(sheet, {
      subject: action.subject
    }))
  });
}

const changeTitle = (state, action) => {
  return assign(state, { title: action.title });
}

const removeColumn = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const cols = splice(sheet.cols, action.col, 1);
  const rows = sheet.rows.map(r => splice(r, action.col, 1));
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols, rows, subject: sheet.subject
    })
  });
}

const removeRow = (state, action) => {
  const sheet = state.sheets[action.sheet];
  const rows = splice(sheet.rows, action.row, 1);
  return assign(state, {
    sheets: splice(state.sheets, action.sheet, 0, {
      cols: sheet.cols, rows, subject: sheet.subject
    })
  });
}

const removeSheet = (state, action) => {
  const sheets = splice(state.sheets, action.sheet, 1);
  return assign(state, { sheets });
}

module.exports = function(state={sheets:[],title:''}, action) {
  switch(action.type) {
    case ADD_COLUMN:
      return addColumn(state, action);
    case ADD_ROW:
      return addRow(state, action);
    case ADD_SHEET:
      return addSheet(state, action);
    case CHANGE_CELL:
      return changeCell(state, action);
    case CHANGE_COLUMN:
      return changeColumn(state, action);
    case CHANGE_SUBJECT:
      return changeSubject(state, action);
    case CHANGE_TITLE:
      return changeTitle(state, action);
    case REMOVE_COLUMN:
      return removeColumn(state, action);
    case REMOVE_ROW:
      return removeRow(state, action);
    case REMOVE_SHEET:
      return removeSheet(state, action);
    default:
      return state;
  }
}
