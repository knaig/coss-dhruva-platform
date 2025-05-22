import {
  Box,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Slide,
  Spacer,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GiHamburgerMenu } from "react-icons/gi";
import SidebarMobile from "./SidebarMobile";
import { BiUser } from "react-icons/bi";

const NavbarMobile = () => {
  const [title, setTitle] = useState<String>("Dashboard");
  const { isOpen, onToggle } = useDisclosure();
  const router = useRouter();

  const Logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("email");
    router.push("/");
  };

  useEffect(() => {
    let url = router.pathname.split("/");
    if (url[1] === "testing-ground") {
      setTitle("Testing Ground");
    } else {
        setTitle("Dashboard");
    }
  }, [router.pathname]);

  return (
    <Box
      paddingLeft={5}
      marginBottom="1rem"
      width="100vw"
      height={"5rem"}
      background="white"
    >
      <Box ml="1rem" pt="1.5rem">
        <HStack>
          <Box mr="1rem" fontSize={"2xl"} onClick={onToggle}>
            <GiHamburgerMenu />
          </Box>
          <Slide
            direction="left"
            in={isOpen}
            style={{ zIndex: 10 }}
            onClick={onToggle}
          >
            <SidebarMobile />
          </Slide>
          <Text fontWeight={"bold"} fontSize="2xl" ml="2rem">
            {title}
          </Text>
          <Spacer />
          <Box>
            <Menu>
              <MenuButton width="2rem" px={0} py={2} transition="all 0.2s">
                <BiUser />
            </MenuButton>
            <MenuList>
              <MenuItem onClick={()=>router.push('/profile')} value="profile">My Profile</MenuItem>
              <MenuItem onClick={Logout} value="logout">Logout</MenuItem>
            </MenuList>
          </Menu>
          </Box>
        </HStack>
      </Box>
    </Box>
  );
};

export default NavbarMobile;
