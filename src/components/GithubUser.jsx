'use strict';

import React from 'react';

import github from '../services/github.js';
import Spinner from './common/Spinner.jsx';
import Profile from './githubUser/Profile.jsx';
import Repos from './githubUser/Repos.jsx';

const ORIGINAL_REPOS_PER_PAGE = 15;

export default class GithubUser extends React.Component {
  constructor(props){

    super(props);

    //init context bindings - due to diff between React.createClass and ES6 class
    this._getInitialState = this._getInitialState.bind(this);
    this.reposGotoPage = this.reposGotoPage.bind(this);
    this.init = this.init.bind(this);

    //init state
    this.state = this._getInitialState();

    //server-side rendering based on passing data retrieved previously from the server
    if(props.params.data){
      this.state.profile = props.data.profile;
      this.state.repositories = props.data.repositories;
    }
    //client-side fetching via xhr
    else if(props.params.username){
      this.init(props.params.username);
    }

  }
  _getInitialState(){
    return{
      profile: {
        pristineLogin: this.props.params.username
      },
      repositories: {
        pristineLogin: this.props.params.username
      }
    }
  }
  init(userName){
    //client-side fetching of the profile via xhr based on username
    this.state.profile.fetching = true;
    github.getUser(userName)
      .then((result) => {
        this.setState({
          profile: {
            data: result.data,
            fetching: false
          }
        });
      })
      .catch((error) => {
        this.setState({
          profile: {
            error : error.humanMessage,
            fetching: false
          }
        });
      });
    //client-side fetching of the repositories via xhr based on the username
    this.state.repositories.fetching = true;
    github.getUserRepos(userName,{
      page: 1,
      sort: "updated",
      per_page: ORIGINAL_REPOS_PER_PAGE
    })
      .then((result) => {
        this.setState({
          repositories: {
            pristineLogin: userName,//pass again (since it was erased)
            data: result.data,
            infos: result.infos,
            fetching: false
          }
        });
      })
      .catch((error) => {
        this.setState({
          repositories: {
            error : error.humanMessage,
            fetching: false
          }
        });
      });
  }
  reposGotoPage(pageNum){
    //client-side fetching of the repositories via xhr based on the username
    this.state.repositories.fetching = true;
    github.getUserRepos(this.state.repositories.pristineLogin,{
      page: pageNum,
      sort: "updated",
      per_page: this.state.repositories.infos.per_page
    })
      .then((result) => {
        this.setState({
          repositories: {
            pristineLogin: this.state.repositories.pristineLogin,//pass again (since it was erased)
            data: result.data,
            infos: result.infos,
            fetching: false
          }
        });
      })
      .catch((error) => {
        this.setState({
          repositories: {
            error : error.humanMessage,
            fetching: false
          }
        });
      });
  }
  reposChangePerPage(perPage){

  }
  render(){
    var profile = this.state.profile;
    var repositories = this.state.repositories;
    return (
      <div>
        <Profile profile={profile}/>
        <Repos repositories={repositories} reposGotoPage={this.reposGotoPage}/>
      </div>
    );
  }
}