'use strict';

import React from 'react';

import github from '../../services/github.js';
import Spinner from '../../components/common/Spinner.jsx';
import Profile from '../../components/Profile/Profile.jsx';
import Repos from '../../components/Repos/Repos.jsx';

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getRepositories, getProfile, initUsername } from '../../redux/modules/singleUser.js';//import action creators

@connect(
  (state) => ({ singleUser: state.singleUser }),
  (dispatch) => bindActionCreators({ getRepositories, getProfile, initUsername }, dispatch)
)
class GithubUser extends React.Component {
  constructor(props){
    super(props);

    //init context bindings - due to diff between React.createClass and ES6 class
    this.reposGotoPage = this.reposGotoPage.bind(this);
    this.componentWillMount = this.componentWillMount.bind(this);
  }
  componentWillMount(){
    this.props.initUsername(this.props.params.username);
    this.props.getProfile(this.props.params.username);
    this.props.getRepositories(this.props.params.username);
  }
  reposGotoPage(pageNum){
    this.props.getRepositories(this.props.params.username,{
      page: pageNum
    });
  }
  render(){
    const { profile } = this.props.singleUser;
    const { repositories } = this.props.singleUser;
    return (
      <div>
        <Profile profile={profile}/>
        <Repos repositories={repositories} reposGotoPage={this.reposGotoPage}/>
      </div>
    );
  }
}

export default GithubUser;