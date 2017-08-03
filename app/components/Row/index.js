const PropTypes = require('prop-types')
const React = require('react')
const Cell = require('../Cell')

function Row({ vals, changeCell, removeRow }) {
  const cells = vals.map((v, i) =>
    <Cell val={v} key={i} change={changeCell(i)} />
  )
  return (
    <div className='row'>
      <label>row</label><br/>
      <button onClick={removeRow}>-</button>
      {cells}
    </div>
  )
}

Row.propTypes = {
  vals: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  changeCell: PropTypes.func.isRequired,
  removeRow: PropTypes.func.isRequired
}

module.exports = Row
