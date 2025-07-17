import {
  Text,
  Box,
  SimpleGrid,
  Button,
  Divider,
  useColorModeValue,
  HStack,
  Spacer,
} from "@chakra-ui/react";
import BaseImage from "../Common/BaseImage";
import { IoConstructOutline, IoGridOutline } from "react-icons/io5";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { RiFlowChart } from "react-icons/ri";
import { BiChart } from "react-icons/bi";
import { VscBeaker } from "react-icons/vsc";
import { pathStartsWith } from "../../utils/basePath";
import RoleBasedComponent from "../Auth/RoleBasedComponent";

const SidebarMobile: React.FC = () => {
  const bg = useColorModeValue("light.100", "dark.100");
  const [isOpen, setNavbar] = useState<Boolean>(false);
  const [number, setNumber] = useState<Number>(0);
  const [userRole, setUserRole] = useState<String>("CONSUMER");
  const router = useRouter();
  
  useEffect(() => {
    setUserRole(localStorage.getItem("user_role"));
    // router.pathname already excludes basePath in Next.js
    switch (router.pathname.split("/")[1]) {
      case "testing-ground":
        setNumber(1);
        break;
      default:
        setNumber(0);
        break;
    }
  }, [router.pathname]);

  return (
    <Box
      h="100vh"
      position="fixed"
      background={bg}
      p="4"
      zIndex={50}
      style={{ textAlign: "center" }}
      width={"200px"}
      transition="width 0.2s"
      boxShadow={"md"}
    >
      <Box borderRadius="xl">
        <Box h="4rem" justifyContent="flex-start">
          <HStack>
            <BaseImage alt="logo" src="/AI4Bharat.svg" height="50" width="50" />
            <Spacer />
            <Text marginLeft={4} fontSize={"x-large"} fontWeight={"bold"}>
              Dhruva
            </Text>
            <Spacer />
            <Spacer />
          </HStack>
        </Box>
        <Divider />
        <SimpleGrid
          spacingY={4}
          spacingX={1}
          mt="9"
          width={"100%"}
          marginLeft={"0"}
        >
          <Box w="100%">
            <Link href={"/testing-ground"}>
              <Button
                mb="2"
                ml={isOpen ? 0 : 0}
                h={10}
                w="100%"
                variant={pathStartsWith(router.pathname, "/testing-ground") ? "solid" : "ghost"}
                background={pathStartsWith(router.pathname, "/testing-ground") ? "orange.500" : "transperent"}
                color={pathStartsWith(router.pathname, "/testing-ground") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={pathStartsWith(router.pathname, "/testing-ground") ? "xl" : "none"}
                transition="width 0.2s"
              >
                <Box>
                  <VscBeaker style={{ marginLeft: 12 }} size={25} />
                </Box>
                <Text marginLeft={4} fontWeight={"normal"}>
                  Testing Ground
                </Text>
              </Button>
            </Link>
          </Box>

          <Box w="100%">
            <Link href={"/services"}>
              <Button
                mb="2"
                ml={isOpen ? 0 : 0}
                h={10}
                w="100%"
                variant={pathStartsWith(router.pathname, "/services") ? "solid" : "ghost"}
                background={pathStartsWith(router.pathname, "/services") ? "orange.500" : "transperent"}
                color={pathStartsWith(router.pathname, "/services") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={pathStartsWith(router.pathname, "/services") ? "xl" : "none"}
                transition="width 0.2s"
              >
                <Box>
                  <IoConstructOutline style={{ marginLeft: 12 }} size={25} />
                </Box>
                <Text marginLeft={4} fontWeight={"normal"}>
                  Services
                </Text>
              </Button>
            </Link>
          </Box>

          <Box w="100%">
            <Link href={"/models"}>
              <Button
                mb="2"
                ml={isOpen ? 0 : 0}
                h={10}
                w="100%"
                variant={pathStartsWith(router.pathname, "/models") ? "solid" : "ghost"}
                background={pathStartsWith(router.pathname, "/models") ? "orange.500" : "transperent"}
                color={pathStartsWith(router.pathname, "/models") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={pathStartsWith(router.pathname, "/models") ? "xl" : "none"}
                transition="width 0.2s"
              >
                <Box>
                  <IoGridOutline style={{ marginLeft: 12 }} size={25} />
                </Box>
                <Text marginLeft={4} fontWeight={"normal"}>
                  Models
                </Text>
              </Button>
            </Link>
          </Box>

          <Box w="100%">
            <Link href={"/pipeline"}>
              <Button
                mb="2"
                ml={isOpen ? 0 : 0}
                h={10}
                w="100%"
                variant={pathStartsWith(router.pathname, "/pipeline") ? "solid" : "ghost"}
                background={pathStartsWith(router.pathname, "/pipeline") ? "orange.500" : "transperent"}
                color={pathStartsWith(router.pathname, "/pipeline") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={pathStartsWith(router.pathname, "/pipeline") ? "xl" : "none"}
                transition="width 0.2s"
              >
                <Box>
                  <RiFlowChart style={{ marginLeft: 12 }} size={25} />
                </Box>
                <Text marginLeft={4} fontWeight={"normal"}>
                  Pipeline
                </Text>
              </Button>
            </Link>
          </Box>

          <Box w="100%">
            <Link href={"/monitoring"}>
              <Button
                mb="2"
                ml={isOpen ? 0 : 0}
                h={10}
                w="100%"
                variant={pathStartsWith(router.pathname, "/monitoring") ? "solid" : "ghost"}
                background={pathStartsWith(router.pathname, "/monitoring") ? "orange.500" : "transperent"}
                color={pathStartsWith(router.pathname, "/monitoring") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={pathStartsWith(router.pathname, "/monitoring") ? "xl" : "none"}
                transition="width 0.2s"
              >
                <Box>
                  <BiChart style={{ marginLeft: 12 }} size={25} />
                </Box>
                <Text marginLeft={4} fontWeight={"normal"}>
                  Monitoring
                </Text>
              </Button>
            </Link>
          </Box>

          <RoleBasedComponent allowedRoles={["ADMIN"]}>
            <Box w="100%">
              <Link href={"/admin"}>
                <Button
                  mb="2"
                  ml={isOpen ? 0 : 0}
                  h={10}
                  w="100%"
                  variant={pathStartsWith(router.pathname, "/admin") ? "solid" : "ghost"}
                  background={pathStartsWith(router.pathname, "/admin") ? "orange.500" : "transperent"}
                  color={pathStartsWith(router.pathname, "/admin") ? "white" : "black"}
                  justifyContent="flex-start"
                  size="l"
                  boxShadow={pathStartsWith(router.pathname, "/admin") ? "xl" : "none"}
                  transition="width 0.2s"
                >
                  <Box>
                    <MdOutlineAdminPanelSettings style={{ marginLeft: 12 }} size={25} />
                  </Box>
                  <Text marginLeft={4} fontWeight={"normal"}>
                    Admin
                  </Text>
                </Button>
              </Link>
            </Box>
          </RoleBasedComponent>
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default SidebarMobile;
