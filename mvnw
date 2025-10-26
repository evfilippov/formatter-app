#!/bin/sh
exec java -classpath .mvn/wrapper/maven-wrapper.jar "-Dmaven.multiModuleProjectDirectory=$PWD" org.apache.maven.wrapper.MavenWrapperMain "$@"
