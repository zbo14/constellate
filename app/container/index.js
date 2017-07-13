const { connect } = require('react-redux');
const Project = require('../components/Project');

const {
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
} = require('../actions');


const mapStateToProps = state => {
  return {
    sheets: state.sheets,
    title: state.title
  }
}

const mapDispatchToProps = dispatch => {
  return {
    addColumn: sheet => dispatch(addColumn(sheet)),
    addRow: sheet => dispatch(addRow(sheet)),
    addSheet: () => dispatch(addSheet()),
    changeCell: sheet => row => cell => val => dispatch(changeCell(sheet, row, cell, val)),
    changeColumn: sheet => col => val => dispatch(changeColumn(sheet, col, val)),
    changeSubject: sheet => subject => dispatch(changeSubject(sheet, subject)),
    changeTitle: title => dispatch(changeTitle(title)),
    removeColumn: sheet => col => dispatch(removeColumn(sheet, col)),
    removeRow: sheet => row => dispatch(removeRow(sheet, row)),
    removeSheet: sheet => dispatch(removeSheet(sheet))
  }
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Project);
