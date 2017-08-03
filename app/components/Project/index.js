const PropTypes = require('prop-types')
const React = require('react')
const Sheet = require('../Sheet')
const Cell = require('../Cell')

const Project = (props) => {
  const sheets = props.sheets.map((sheet, i) =>
    <Sheet cols={sheet.cols} rows={sheet.rows} subject={sheet.subject} key={i}
    addColumn={props.addColumn(i)} addRow={props.addRow(i)}
    changeCell={props.changeCell(i)} changeColumn={props.changeColumn(i)} changeSubject={props.changeSubject(i)}
    removeColumn={props.removeColumn(i)} removeRow={props.removeRow(i)} removeSheet={props.removeSheet(i)} />
  )
  return (
    <div className='project'>
      <button onClick={props.addSheet}>+</button>
      <div className='title'>
        <Cell val={props.title} change={props.changeTitle} />
      </div>
      <div className='sheets'>
        {sheets}
      </div>
    </div>
  )
}

Project.propTypes = {
  sheets: PropTypes.arrayOf(PropTypes.shape({
    cols: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
    rows: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string.isRequired).isRequired).isRequired,
    subject: PropTypes.string.isRequired
  }).isRequired).isRequired,
  title: PropTypes.string.isRequired,
  addColumn: PropTypes.func.isRequired,
  addRow: PropTypes.func.isRequired,
  changeCell: PropTypes.func.isRequired,
  changeColumn: PropTypes.func.isRequired,
  changeSubject: PropTypes.func.isRequired,
  changeTitle: PropTypes.func.isRequired,
  removeColumn: PropTypes.func.isRequired,
  removeRow: PropTypes.func.isRequired,
  removeSheet: PropTypes.func.isRequired
}

module.exports = Project
