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
import Image from "next/image";
import { IoConstructOutline, IoGridOutline } from "react-icons/io5";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { RiFlowChart } from "react-icons/ri";
import { BiChart } from "react-icons/bi";
import { VscBeaker } from "react-icons/vsc";

const SidebarMobile: React.FC = () => {
  const bg = useColorModeValue("light.100", "dark.100");
  const [isOpen, setNavbar] = useState<Boolean>(false);
  const [number, setNumber] = useState<Number>(0);
  const [userRole, setUserRole] = useState<String>("CONSUMER");
  const router = useRouter();
  
  useEffect(() => {
    setUserRole(localStorage.getItem("user_role"));
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
            <Image alt="logo" src="/AI4Bharat.svg" height="50" width="50" />
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
                variant={router.pathname.startsWith("/testing-ground") ? "solid" : "ghost"}
                background={router.pathname.startsWith("/testing-ground") ? "orange.500" : "transperent"}
                color={router.pathname.startsWith("/testing-ground") ? "white" : "black"}
                justifyContent="flex-start"
                size="l"
                boxShadow={router.pathname.startsWith("/testing-ground") ? "xl" : "none"}
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
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default SidebarMobile;
