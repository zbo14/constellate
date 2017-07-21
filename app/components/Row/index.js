const PropTypes = require('prop-types');
const React = require('react');
const Cell = require('../Cell');

function Row({ vals, changeCell, remove }) {
  const cells = vals.map((v, i) =>
    <Cell val={v} key={i} change={changeCell(i)} />
  );
  return (
    <div className="row">
      <button onClick={remove}>-</button>
      {cells}
    </div>
  );
}

Row.propTypes = {
  vals: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  changeCell: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired
}

module.exports = Row;
