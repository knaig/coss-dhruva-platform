import { Box, HStack, Menu, MenuButton, MenuItem, MenuList, Text, Button, Flex, Spacer } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { BiUser } from "react-icons/bi";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "../../api/authAPI";
import Image from "next/image";

const Navbar = () => {
  const [title, setTitle] = useState<String>("Testing Ground");
  const router = useRouter();
  const {data:user} = useQuery(['User'], ()=>getUser(localStorage.getItem('email')))

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
      setTitle("Testing Ground");
    }
  }, [router.pathname]);

  return (
    <Box
      as="nav"
      w="100%"
      bg="white"
      boxShadow="sm"
      px={[2, 4, 8]}
      py={3}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <Flex align="center" maxW="8xl" mx="auto">
        {/* Logo and App Name */}
        <HStack spacing={3}>
          <Image alt="logo" src="/AI4Bharat.svg" height={40} width={40} />
          <Text fontWeight="bold" fontSize="2xl" color="orange.600" letterSpacing="wide">
            Dhruva
        </Text>
        </HStack>
        <Spacer />
        {/* Testing Ground Button */}
        <Button
          colorScheme="orange"
          variant={router.pathname.startsWith("/testing-ground") ? "solid" : "outline"}
          size="lg"
          fontWeight="bold"
          fontSize="lg"
          borderRadius="xl"
          px={8}
          mx={4}
          onClick={() => router.push("/testing-ground")}
          boxShadow={router.pathname.startsWith("/testing-ground") ? "md" : undefined}
        >
          Testing Ground
        </Button>
        <Spacer />
        {/* User Profile */}
        <Menu>
          <MenuButton px={4} py={2} transition='all 0.2s'>
          <HStack>
              <BiUser size={22} />
              <Text fontWeight="medium">{user?.name || "Admin"}</Text>
          </HStack>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={()=>router.push('/profile')} value="profile">My Profile</MenuItem>
          <MenuItem onClick={Logout} value="logout">Logout</MenuItem>
        </MenuList>
      </Menu>
      </Flex>
    </Box>
  );
};

export default Navbar;
