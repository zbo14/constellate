'use strict'
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
} = require('../actions')

const {
  assign,
  newArray,
  splice
} = require('../../lib/util')

const remove = (arr, idx) => splice(arr, idx, 1)

const replace = (arr, idx, item) => splice(arr, idx, 1, item)

const addColumn = (state, action) => {
  const sheet = state.sheets[action.sheet]
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      cols: sheet.cols.concat(''),
      rows: sheet.rows.map(r => r.concat('')),
    }))
  })
}

const addRow = (state, action) => {
  const sheet = state.sheets[action.sheet]
  if (!sheet.cols.length) {
    // if no cols, dont add row
    return state
  }
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      rows: sheet.rows.concat([newArray('', sheet.cols.length)])
    }))
  })
}

const addSheet = (state, action) => {
  return assign(state, {
    sheets:  state.sheets.concat({
      cols: ['name'],
      rows: [],
      subject: ''
    })
  })
}

const changeCell = (state, action) => {
  const sheet = state.sheets[action.sheet]
  const row = replace(sheet.rows[action.row], action.cell, action.val)
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      rows: replace(sheet.rows, action.row, row)
    }))
  })
}

const changeColumn = (state, action) => {
  const sheet = state.sheets[action.sheet]
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      cols: replace(sheet.cols, action.col, action.val)
    }))
  })
}

const changeSubject = (state, action) => {
  const sheet = state.sheets[action.sheet]
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      subject: action.subject
    }))
  })
}

const changeTitle = (state, action) => {
  return assign(state, { title: action.title })
}

const removeColumn = (state, action) => {
  const sheet = state.sheets[action.sheet]
  const cols = remove(sheet.cols, action.col)
  let rows
  if (cols.length) {
    rows = sheet.rows.map(r => remove(r, action.col))
  } else {
    // if no cols, get rid of rows
    rows = []
  }
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, { cols, rows }))
  })
}

const removeRow = (state, action) => {
  const sheet = state.sheets[action.sheet]
  return assign(state, {
    sheets: replace(state.sheets, action.sheet, assign(sheet, {
      rows: remove(sheet.rows, action.row)
    }))
  })
}

const removeSheet = (state, action) => {
  return assign(state, {
    sheets: remove(state.sheets, action.sheet)
  })
}

module.exports = function(state={sheets:[],title:''}, action) {
  switch(action.type) {
    case ADD_COLUMN:
      return addColumn(state, action)
    case ADD_ROW:
      return addRow(state, action)
    case ADD_SHEET:
      return addSheet(state, action)
    case CHANGE_CELL:
      return changeCell(state, action)
    case CHANGE_COLUMN:
      return changeColumn(state, action)
    case CHANGE_SUBJECT:
      return changeSubject(state, action)
    case CHANGE_TITLE:
      return changeTitle(state, action)
    case REMOVE_COLUMN:
      return removeColumn(state, action)
    case REMOVE_ROW:
      return removeRow(state, action)
    case REMOVE_SHEET:
      return removeSheet(state, action)
    default:
      return state
  }
}
