const PropTypes = require('prop-types')
const React = require('react')
const Cell = require('../Cell')

function Column({ val, change, removeColumn}) {
  return (
    <div className='column'>
      <label>column</label><br/>
      <button onClick={removeColumn}>-</button>
      <Cell val={val} change={change} />
    </div>
  )
}

Column.propTypes = {
  val: PropTypes.string.isRequired,
  change: PropTypes.func.isRequired,
  removeColumn: PropTypes.func.isRequired
}

module.exports = Column
