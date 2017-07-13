const PropTypes = require('prop-types');
const React = require('react');
const Cell = require('../Cell');
const Column = require('../Column');
const Row = require('../Row');

const Sheet = (props) => {
  const cols = props.cols.map((c, i) =>
    <Column val={c} key={i} change={props.changeColumn(i)} remove={props.removeColumn(i)} />
  );
  const rows = props.rows.map((r, i) =>
    <Row vals={r} key={i} changeCell={props.changeCell(i)} remove={props.removeRow(i)} />
  );
  return (
    <div className="sheet">
      <div className="subject">
        <Cell val={props.subject} change={props.changeSubject} />
      </div>
      <div className="columns">
        <button onClick={props.addColumn}>+</button>
        {cols}
      </div>
      <div className="rows">
        <button onClick={props.addRow}>+</button>
        {rows}
      </div>
    </div>
  );
}

Sheet.propTypes = {
  cols: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  rows: PropTypes.number.isRequired,
  subject: PropTypes.string.isRequired,
  addColumn: PropTypes.func.isRequired,
  addRow: PropTypes.func.isRequired,
  changeCell: PropTypes.func.isRequired,
  changeColumn: PropTypes.func.isRequired,
  changeSubject: PropTypes.func.isRequired,
  removeColumn: PropTypes.func.isRequired,
  removeRow: PropTypes.func.isRequired
}

module.exports = Sheet;
